import { Worker } from 'worker_threads';
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
  employeeIds: string[] | undefined,
  concurrency: number
): Job {
  // Prevent duplicate concurrent jobs
  const active = getActiveJob();
  if (active) {
    throw new Error(`A generation job is already in progress (ID: ${active.id})`);
  }

  // Gather data
  const employees = buildPayslipData(payMonth, employeeIds);
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
  employeeIds: string[] | undefined
): PayslipEmployee[] {
  const paysheets = readJSON<MonthlyPaysheetDTO>('monthly-paysheets.json');
  const users = readJSON<User>('users.json');
  const userMap = new Map(users.map((u) => [u.id, u]));

  let filtered = paysheets.filter((p) => p.payMonth === payMonth);
  if (employeeIds && employeeIds.length > 0) {
    const idSet = new Set(employeeIds);
    filtered = filtered.filter((p) => idSet.has(p.employeeId));
  }

  return filtered.map((p): PayslipEmployee => {
    const user = userMap.get(p.employeeId);
    return {
      id: p.id || p.employeeId,
      codeNo: p.codeNo,
      firstName: user?.firstName || p.codeNo,
      lastName: user?.lastName || '',
      designation: user?.designation || p.role,
      branch: user?.branch || '',
      payMonth: p.payMonth,
      basicSalary: p.basicSalary || 0,
      vehicleAllowance: p.vehicleAllowance || 0,
      fuelAllowance: p.fuelAllowance || 0,
      generalAllowance: p.generalAllowance || 0,
      orc: p.orc || 0,
      otherOffer: p.otherOffer || 0,
      grossSalary: p.grossSalary || 0,
      epfEmployee: p.epfEmployee || 0,
      epfEmployer: p.epfEmployer || 0,
      etf: p.etf || 0,
      nopayDeduction: p.nopayDeduction || 0,
      lateDeduction: p.lateDeduction || 0,
      welfare: p.welfare || 0,
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
