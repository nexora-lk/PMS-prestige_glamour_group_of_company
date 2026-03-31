import { Worker } from 'worker_threads';
import { execFile } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import logger from '../utils/logger';
import { readJSON } from './jsonStore';
import type { MonthlyPaysheetDTO, User } from '../models';
import type { PayslipEmployee } from '../types/worker';
import type {
  DotMatrixJob,
  DotMatrixTask,
  DotMatrixMessage,
} from '../types/dotMatrix';

// ── Directories ─────────────────────────────────────────────

const TEMP_DIR = path.join(__dirname, '..', '..', 'temp');
const OUTPUT_DIR = path.join(__dirname, '..', '..', 'exports');
const WORKER_CONCURRENCY = 4; // batch workers for file writing

function ensureDirs(): void {
  for (const dir of [TEMP_DIR, OUTPUT_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

// ── Job store (in-memory) ───────────────────────────────────

const jobs = new Map<string, DotMatrixJob>();

export function getDotMatrixJob(jobId: string): DotMatrixJob | undefined {
  return jobs.get(jobId);
}

export function getActiveDotMatrixJob(): DotMatrixJob | undefined {
  for (const job of jobs.values()) {
    if (job.status === 'processing' || job.status === 'pending') {
      return job;
    }
  }
  return undefined;
}

// ── Public: Start generation ────────────────────────────────

export function startDotMatrixGeneration(
  payMonth: string,
  employeeIds: string[] | undefined,
  useEscP: boolean
): DotMatrixJob {
  const active = getActiveDotMatrixJob();
  if (active) {
    throw new Error(`A dot matrix generation job is already in progress (ID: ${active.id})`);
  }

  const employees = buildPayslipData(payMonth, employeeIds);
  if (employees.length === 0) {
    throw new Error(`No paysheets found for ${payMonth}`);
  }

  const job: DotMatrixJob = {
    id: uuidv4(),
    status: 'pending',
    total: employees.length,
    completed: 0,
    failed: 0,
    progress: 0,
    filePath: null,
    error: null,
    payMonth,
    createdAt: new Date().toISOString(),
  };
  jobs.set(job.id, job);

  logger.info(`Dot matrix job ${job.id} created for ${employees.length} employees (month: ${payMonth}, escP: ${useEscP})`);

  processJob(job, employees, useEscP).catch((err) => {
    job.status = 'failed';
    job.error = err instanceof Error ? err.message : String(err);
    logger.error(`Dot matrix job ${job.id} failed`, { error: job.error });
  });

  return job;
}

// ── Public: Print file ──────────────────────────────────────

export async function printDotMatrixFile(
  jobId: string,
  printerName?: string,
  copies: number = 1
): Promise<string> {
  const job = jobs.get(jobId);
  if (!job) throw new Error('Job not found');
  if (job.status !== 'completed' || !job.filePath) {
    throw new Error('File not ready for printing');
  }
  if (!fs.existsSync(job.filePath)) {
    throw new Error('Generated file has been cleaned up');
  }

  job.status = 'printing';
  const filePath = job.filePath as string;

  try {
    if (process.platform === 'win32') {
      await printFileWindows(filePath, printerName, copies);
    } else {
      await printFileUnix(filePath, printerName, copies);
    }

    job.status = 'completed';
    const msg = `Sent ${copies} copy/copies to ${printerName || 'default printer'}`;
    logger.info(msg, { jobId });
    return msg;
  } catch (err) {
    job.status = 'completed'; // revert
    throw err;
  }
}

// ── Data assembly (reuses same logic as PDF service) ────────

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
  job: DotMatrixJob,
  employees: PayslipEmployee[],
  useEscP: boolean
): Promise<void> {
  ensureDirs();

  const jobDir = path.join(TEMP_DIR, `dot_${job.id}`);
  fs.mkdirSync(jobDir, { recursive: true });

  job.status = 'processing';

  // Split into batches for parallel worker writing
  const concurrency = Math.min(WORKER_CONCURRENCY, employees.length);
  const batchSize = Math.ceil(employees.length / concurrency);
  const batches: PayslipEmployee[][] = [];
  for (let i = 0; i < employees.length; i += batchSize) {
    batches.push(employees.slice(i, i + batchSize));
  }

  logger.info(`Dot matrix job ${job.id}: ${employees.length} payslips in ${batches.length} batches`);

  const workerPath = path.join(__dirname, '..', 'workers', 'dot-matrix-worker.js');

  try {
    const batchFiles = await runWorkers(job, batches, jobDir, workerPath, useEscP);

    // Merge batch files into single output
    const ext = useEscP ? '.prn' : '.txt';
    const outputFile = path.join(OUTPUT_DIR, `payslips_${job.payMonth}_${job.id.slice(0, 8)}${ext}`);
    await mergeFiles(batchFiles, outputFile);

    job.filePath = outputFile;
    job.status = 'completed';
    job.progress = 100;
    logger.info(`Dot matrix job ${job.id}: completed. File at ${outputFile}`);
  } catch (err) {
    job.status = 'failed';
    job.error = err instanceof Error ? err.message : String(err);
    logger.error(`Dot matrix job ${job.id} failed`, { error: job.error });
  } finally {
    cleanup(jobDir);
  }
}

function runWorkers(
  job: DotMatrixJob,
  batches: PayslipEmployee[][],
  jobDir: string,
  workerPath: string,
  useEscP: boolean
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    let finishedWorkers = 0;
    let hasRejected = false;
    const workers: Worker[] = [];
    const batchFiles: string[] = [];

    for (let i = 0; i < batches.length; i++) {
      const batchFile = path.join(jobDir, `batch_${i}${useEscP ? '.prn' : '.txt'}`);
      batchFiles.push(batchFile);

      const worker = new Worker(workerPath);
      workers.push(worker);

      worker.on('message', (msg: DotMatrixMessage) => {
        if (hasRejected) return;

        switch (msg.type) {
          case 'progress':
            job.completed++;
            job.progress = Math.floor((job.completed / job.total) * 95);
            break;

          case 'error':
            job.failed++;
            logger.warn(`Dot matrix job ${job.id}: payslip failed - ${msg.message}`, {
              failedId: msg.failedId,
            });
            break;

          case 'done':
            finishedWorkers++;
            logger.info(`Dot matrix job ${job.id}: batch ${msg.batchIndex} done (${msg.linesWritten} lines)`);
            if (finishedWorkers === batches.length) {
              resolve(batchFiles);
            }
            break;
        }
      });

      worker.on('error', (err) => {
        if (hasRejected) return;
        hasRejected = true;
        logger.error(`Dot matrix worker ${i} crashed`, { error: err.message });
        terminateAll(workers);
        reject(err);
      });

      worker.on('exit', (code) => {
        if (code !== 0 && !hasRejected) {
          finishedWorkers++;
          logger.warn(`Dot matrix worker ${i} exited with code ${code}`);
          if (finishedWorkers === batches.length) {
            resolve(batchFiles);
          }
        }
      });

      const task: DotMatrixTask = {
        type: 'generate',
        batch: batches[i],
        outputPath: batchFile,
        batchIndex: i,
        useEscP,
      };
      worker.postMessage(task);
    }
  });
}

// ── Merge batch files into one (streaming) ──────────────────

function mergeFiles(inputFiles: string[], outputFile: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputFile);
    output.on('error', reject);
    output.on('finish', resolve);

    let idx = 0;

    function pipeNext(): void {
      if (idx >= inputFiles.length) {
        output.end();
        return;
      }

      const filePath = inputFiles[idx];
      idx++;

      if (!fs.existsSync(filePath)) {
        pipeNext();
        return;
      }

      const input = fs.createReadStream(filePath);
      input.on('error', (err) => {
        logger.warn(`Error reading batch file ${filePath}`, { error: err.message });
        pipeNext();
      });
      input.on('end', pipeNext);
      input.pipe(output, { end: false });
    }

    pipeNext();
  });
}

// ── Helpers ─────────────────────────────────────────────────

// ── Print helpers (platform-specific) ───────────────────────

function sanitizePrinterName(name: string): string {
  // Strip characters that could break PowerShell/shell commands
  return name.replace(/['"`;$|&<>(){}[\]\\]/g, '');
}

function printFileWindows(filePath: string, printerName?: string, copies: number = 1): Promise<void> {
  return new Promise((resolve, reject) => {
    const safePrinter = printerName ? sanitizePrinterName(printerName) : '';
    const safePath = filePath.replace(/'/g, "''"); // PowerShell escape

    const commands: string[] = [];
    for (let i = 0; i < copies; i++) {
      if (safePrinter) {
        commands.push(`Get-Content -Path '${safePath}' -Raw | Out-Printer -Name '${safePrinter}'`);
      } else {
        commands.push(`Get-Content -Path '${safePath}' -Raw | Out-Printer`);
      }
    }

    execFile(
      'powershell.exe',
      ['-NoProfile', '-Command', commands.join('; ')],
      { timeout: 120000 },
      (err) => {
        if (err) {
          logger.error('Print failed', { error: err.message, printer: safePrinter });
          reject(new Error(`Print failed: ${err.message}`));
          return;
        }
        resolve();
      }
    );
  });
}

function printFileUnix(filePath: string, printerName?: string, copies: number = 1): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [filePath];
    if (printerName) args.push('-d', sanitizePrinterName(printerName));
    if (copies > 1) args.push('-n', String(copies));

    execFile('lp', args, (err) => {
      if (err) {
        reject(new Error(`Print failed: ${err.message}`));
        return;
      }
      resolve();
    });
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

function cleanup(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (err) {
    logger.warn(`Failed to clean up temp dir: ${dir}`, {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
