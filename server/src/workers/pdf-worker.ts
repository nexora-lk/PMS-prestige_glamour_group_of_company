import { parentPort } from 'worker_threads';
import puppeteer, { type Page } from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { renderPayslipHTML } from '../templates/payslip';
import type { WorkerTask, WorkerMessage, PayslipEmployee } from '../types/worker';

const MAX_RETRIES = 2;

async function renderPDF(
  page: Page,
  employee: PayslipEmployee,
  outputDir: string
): Promise<string> {
  const html = renderPayslipHTML(employee);
  await page.setContent(html, { waitUntil: 'domcontentloaded' });

  const safeName = `${employee.codeNo}_${employee.payMonth}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filePath = path.join(outputDir, `${safeName}.pdf`);

  await page.pdf({
    path: filePath,
    format: 'A4',
    printBackground: true,
    margin: { top: '10mm', bottom: '10mm', left: '5mm', right: '5mm' },
  });

  return filePath;
}

async function processBatch(task: WorkerTask): Promise<void> {
  const { batch, outputDir, batchIndex } = task;
  const files: string[] = [];
  let completedCount = 0;

  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 800, height: 1200 });

    for (const employee of batch) {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const filePath = await renderPDF(page, employee, outputDir);
          files.push(filePath);
          lastError = null;
          break;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          if (attempt < MAX_RETRIES) {
            await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
          }
        }
      }

      if (lastError) {
        const msg: WorkerMessage = {
          type: 'error',
          message: `Failed to render payslip for ${employee.codeNo}: ${lastError.message}`,
          batchIndex,
          failedId: employee.id,
        };
        parentPort?.postMessage(msg);
      }

      completedCount++;
      const progress: WorkerMessage = {
        type: 'progress',
        completed: completedCount,
        batchIndex,
      };
      parentPort?.postMessage(progress);
    }

    await page.close();
  } finally {
    await browser.close();
  }

  const done: WorkerMessage = { type: 'done', files, batchIndex };
  parentPort?.postMessage(done);
}

// Listen for tasks from main thread
parentPort?.on('message', (task: WorkerTask) => {
  if (task.type === 'render') {
    processBatch(task).catch((err) => {
      const msg: WorkerMessage = {
        type: 'error',
        message: `Worker crashed: ${err instanceof Error ? err.message : String(err)}`,
        batchIndex: task.batchIndex,
      };
      parentPort?.postMessage(msg);
    });
  }
});
