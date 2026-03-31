import { Worker } from 'worker_threads';
import { execFile } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import logger from '../utils/logger';
import { readJSON } from './jsonStore';
import type { MonthlyPaysheetDTO, User } from '../models';
import type {
  Job,
  PayslipEmployee,
  WorkerTask,
  WorkerMessage,
} from '../types/worker';

// ── Job store (in-memory) ───────────────────────────────────

const jobs = new Map<string, Job>();
const TEMP_DIR = path.join(__dirname, '..', '..', 'temp');
const OUTPUT_DIR = path.join(__dirname, '..', '..', 'exports');

function ensureDirs(): void {
  for (const dir of [TEMP_DIR, OUTPUT_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

// ── Public API ──────────────────────────────────────────────

export function getJob(jobId: string): Job | undefined {
  return jobs.get(jobId);
}

export function getActiveJob(): Job | undefined {
  for (const job of jobs.values()) {
    if (job.status === 'processing' || job.status === 'zipping' || job.status === 'pending') {
      return job;
    }
  }
  return undefined;
}

export function startPayslipGeneration(
  payMonth: string,
  codeNos: string[] | undefined,
  concurrency: number
): Job {
  // Prevent duplicate concurrent jobs
  const active = getActiveJob();
  if (active) {
    throw new Error(`A generation job is already in progress (ID: ${active.id})`);
  }

  // Gather data
  const employees = buildPayslipData(payMonth, codeNos);
  if (employees.length === 0) {
    throw new Error(`No paysheets found for ${payMonth}`);
  }

  // Create job
  const job: Job = {
    id: uuidv4(),
    status: 'pending',
    total: employees.length,
    completed: 0,
    failed: 0,
    progress: 0,
    zipPath: null,
    error: null,
    createdAt: new Date().toISOString(),
  };
  jobs.set(job.id, job);

  logger.info(`Payslip job ${job.id} created for ${employees.length} employees (month: ${payMonth})`);

  // Start processing in background (non-blocking)
  processJob(job, employees, concurrency).catch((err) => {
    job.status = 'failed';
    job.error = err instanceof Error ? err.message : String(err);
    logger.error(`Job ${job.id} failed`, { error: job.error });
  });

  return job;
}

// ── Data assembly ───────────────────────────────────────────

function buildPayslipData(
  payMonth: string,
  codeNos: string[] | undefined
): PayslipEmployee[] {
  const paysheets = readJSON<MonthlyPaysheetDTO>('monthly-paysheets.json');
  const users = readJSON<User>('users.json');
  const userMap = new Map(users.map((u) => [u.codeNo, u]));

  let filtered = paysheets.filter((p) => p.payMonth === payMonth);
  if (codeNos && codeNos.length > 0) {
    const codeSet = new Set(codeNos);
    filtered = filtered.filter((p) => codeSet.has(p.codeNo));
  }

  return filtered.map((p): PayslipEmployee => {
    const user = userMap.get(p.codeNo);
    return {
      id: p.id || p.codeNo,
      codeNo: p.codeNo,
      firstName: user?.firstName || p.codeNo,
      lastName: user?.lastName || '',
      designation: user?.designation || p.role,
      branch: user?.branch || '',
      bankName: user?.bankName || '',
      bankAccount: user?.bankAccount || '',
      payMonth: p.payMonth,
      basicSalary: p.basicSalary || 0,
      vehicleAllowance: p.vehicleAllowance || 0,
      fuelAllowance: p.fuelAllowance || 0,
      generalAllowance: p.generalAllowance || 0,
      orc: p.orc || 0,
      otherOffer: p.otherOffer || 0,
      customEarningName: p.customEarningName || '',
      customEarningAmount: p.customEarningAmount || 0,
      grossSalary: p.grossSalary || 0,
      epfEmployee: p.epfEmployee || 0,
      epfEmployer: p.epfEmployer || 0,
      etf: p.etf || 0,
      nopayDeduction: p.nopayDeduction || 0,
      lateDeduction: p.lateDeduction || 0,
      welfare: p.welfare || 0,
      customDeductionName: p.customDeductionName || '',
      customDeductionAmount: p.customDeductionAmount || 0,
      netSalary: p.netSalary || 0,
      achievementPct: p.achievementPct || 0,
      assignedTarget: p.assignedTarget || 0,
      createdAt: p.createdAt || new Date().toISOString(),
    };
  });
}

// ── Job processing ──────────────────────────────────────────

async function processJob(
  job: Job,
  employees: PayslipEmployee[],
  concurrency: number
): Promise<void> {
  ensureDirs();

  const jobDir = path.join(TEMP_DIR, job.id);
  fs.mkdirSync(jobDir, { recursive: true });

  job.status = 'processing';

  // Split into batches
  const batchSize = Math.ceil(employees.length / concurrency);
  const batches: PayslipEmployee[][] = [];
  for (let i = 0; i < employees.length; i += batchSize) {
    batches.push(employees.slice(i, i + batchSize));
  }

  const actualConcurrency = batches.length;
  logger.info(`Job ${job.id}: ${employees.length} payslips in ${actualConcurrency} batches`);

  // Resolve worker script path (compiled JS in dist/)
  const workerPath = path.join(__dirname, '..', 'workers', 'pdf-worker.js');

  try {
    await runWorkers(job, batches, jobDir, workerPath);
  } catch (err) {
    job.status = 'failed';
    job.error = err instanceof Error ? err.message : String(err);
    logger.error(`Job ${job.id} worker phase failed`, { error: job.error });
    cleanup(jobDir);
    return;
  }

  // ZIP phase
  job.status = 'zipping';
  logger.info(`Job ${job.id}: zipping ${job.completed} PDFs`);

  try {
    const zipPath = await createZip(jobDir, job.id);
    job.zipPath = zipPath;
    job.status = 'completed';
    job.progress = 100;
    logger.info(`Job ${job.id}: completed. ZIP at ${zipPath}`);
  } catch (err) {
    job.status = 'failed';
    job.error = `ZIP creation failed: ${err instanceof Error ? err.message : String(err)}`;
    logger.error(`Job ${job.id} zip failed`, { error: job.error });
  } finally {
    cleanup(jobDir);
  }
}

function runWorkers(
  job: Job,
  batches: PayslipEmployee[][],
  jobDir: string,
  workerPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    let finishedWorkers = 0;
    let hasRejected = false;
    const workers: Worker[] = [];

    for (let i = 0; i < batches.length; i++) {
      const worker = new Worker(workerPath);
      workers.push(worker);

      worker.on('message', (msg: WorkerMessage) => {
        if (hasRejected) return;

        switch (msg.type) {
          case 'progress':
            job.completed++;
            job.progress = Math.floor((job.completed / job.total) * 95); // 0-95%, last 5% for zipping
            break;

          case 'error':
            job.failed++;
            logger.warn(`Job ${job.id}: payslip failed - ${msg.message}`, {
              failedId: msg.failedId,
            });
            break;

          case 'done':
            finishedWorkers++;
            logger.info(`Job ${job.id}: batch ${msg.batchIndex} done (${msg.files.length} files)`);
            if (finishedWorkers === batches.length) {
              resolve();
            }
            break;
        }
      });

      worker.on('error', (err) => {
        if (hasRejected) return;
        hasRejected = true;
        logger.error(`Worker ${i} crashed`, { error: err.message });
        terminateAll(workers);
        reject(err);
      });

      worker.on('exit', (code) => {
        if (code !== 0 && !hasRejected) {
          // Worker exited without sending 'done' - count it as finished to avoid hanging
          finishedWorkers++;
          logger.warn(`Worker ${i} exited with code ${code}`);
          if (finishedWorkers === batches.length) {
            resolve();
          }
        }
      });

      // Send task
      const task: WorkerTask = {
        type: 'render',
        batch: batches[i],
        outputDir: jobDir,
        batchIndex: i,
      };
      worker.postMessage(task);
    }
  });
}

function terminateAll(workers: Worker[]): void {
  for (const w of workers) {
    try {
      w.terminate();
    } catch {
      // ignore
    }
  }
}

// ── ZIP creation ────────────────────────────────────────────

function createZip(sourceDir: string, jobId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    ensureDirs();
    const zipPath = path.join(OUTPUT_DIR, `payslips_${jobId}.zip`);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 6 } });

    output.on('close', () => resolve(zipPath));
    archive.on('error', (err) => reject(err));
    archive.on('warning', (err) => {
      if (err.code !== 'ENOENT') reject(err);
    });

    archive.pipe(output);

    // Stream all PDFs from the temp directory into the ZIP
    const files = fs.readdirSync(sourceDir).filter((f) => f.endsWith('.pdf'));
    for (const file of files) {
      archive.file(path.join(sourceDir, file), { name: file });
    }

    archive.finalize();
  });
}

// ── Print PDFs ─────────────────────────────────────────────

export async function printPayslips(
  jobId: string,
  printerName?: string,
  copies: number = 1
): Promise<string> {
  const job = jobs.get(jobId);
  if (!job) throw new Error('Job not found');
  if (job.status !== 'completed' || !job.zipPath) {
    throw new Error('ZIP not ready for printing');
  }
  if (!fs.existsSync(job.zipPath)) {
    throw new Error('ZIP file has been cleaned up');
  }

  // Extract ZIP to temp dir for printing
  const printDir = path.join(TEMP_DIR, `print_${jobId}`);
  fs.mkdirSync(printDir, { recursive: true });

  // Use archiver's unzip equivalent — read ZIP and extract PDFs
  const AdmZip = await import('adm-zip');
  const zip = new AdmZip.default(job.zipPath);
  zip.extractAllTo(printDir, true);

  const pdfFiles = fs.readdirSync(printDir).filter((f) => f.endsWith('.pdf')).sort();

  if (pdfFiles.length === 0) {
    cleanup(printDir);
    throw new Error('No PDF files found in ZIP');
  }

  logger.info(`Printing ${pdfFiles.length} PDFs (${copies} copies) to ${printerName || 'default printer'}`, { jobId });

  try {
    if (process.platform === 'win32') {
      await printPdfsWindows(printDir, pdfFiles, printerName, copies);
    } else {
      await printPdfsUnix(printDir, pdfFiles, printerName, copies);
    }

    const msg = `Sent ${pdfFiles.length} payslips (${copies} copies) to ${printerName || 'default printer'}`;
    logger.info(msg, { jobId });
    return msg;
  } finally {
    cleanup(printDir);
  }
}

function printPdfsWindows(
  dir: string,
  files: string[],
  printerName?: string,
  copies: number = 1
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Build PowerShell script to print all PDFs
    const safePrinter = printerName ? printerName.replace(/['"]/g, '') : '';
    const pdfPaths = files.map((f) => path.join(dir, f).replace(/\\/g, '\\\\'));

    const commands: string[] = [];
    for (const pdfPath of pdfPaths) {
      for (let c = 0; c < copies; c++) {
        if (safePrinter) {
          commands.push(
            `Start-Process -FilePath '${pdfPath}' -Verb PrintTo -ArgumentList '${safePrinter}' -Wait`
          );
        } else {
          commands.push(
            `Start-Process -FilePath '${pdfPath}' -Verb Print -Wait`
          );
        }
      }
    }

    const script = commands.join('; ');

    execFile('powershell.exe', ['-NoProfile', '-Command', script], { timeout: 300000 }, (err) => {
      if (err) {
        reject(new Error(`PDF print failed: ${err.message}`));
        return;
      }
      resolve();
    });
  });
}

function printPdfsUnix(
  dir: string,
  files: string[],
  printerName?: string,
  copies: number = 1
): Promise<void> {
  return new Promise((resolve, reject) => {
    let completed = 0;
    let hasError = false;

    for (const file of files) {
      const filePath = path.join(dir, file);
      const args = [filePath];
      if (printerName) args.push('-d', printerName);
      if (copies > 1) args.push('-n', String(copies));

      execFile('lp', args, (err) => {
        if (hasError) return;
        if (err) {
          hasError = true;
          reject(new Error(`Print failed for ${file}: ${err.message}`));
          return;
        }
        completed++;
        if (completed === files.length) resolve();
      });
    }
  });
}

// ── Cleanup ─────────────────────────────────────────────────

function cleanup(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (err) {
    logger.warn(`Failed to clean up temp dir: ${dir}`, {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
