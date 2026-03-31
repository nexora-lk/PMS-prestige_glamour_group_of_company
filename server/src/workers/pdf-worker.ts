import { parentPort } from 'worker_threads';
import puppeteer, { type Page } from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { renderPayslipHTML } from '../templates/payslip';
import type { WorkerTask, WorkerMessage, PayslipEmployee } from '../types/worker';

const MAX_RETRIES = 2;

// Find Chrome executable — check bundled .chromium, global puppeteer cache, then common install paths
function findChromePath(): string | undefined {
  const isWin = process.platform === 'win32';
  const exeName = isWin ? 'chrome.exe' : 'chrome';

  // Search a puppeteer-style cache directory for the chrome binary
  function searchCache(cacheRoot: string): string | undefined {
    const chromeDir = path.join(cacheRoot, 'chrome');
    if (!fs.existsSync(chromeDir)) return undefined;
    try {
      const platforms = fs.readdirSync(chromeDir);
      for (const platform of platforms) {
        const versions = fs.readdirSync(path.join(chromeDir, platform));
        for (const ver of versions) {
          const winPath = path.join(chromeDir, platform, ver, 'chrome-win64', exeName);
          const linuxPath = path.join(chromeDir, platform, ver, 'chrome-linux64', exeName);
          if (fs.existsSync(winPath)) return winPath;
          if (fs.existsSync(linuxPath)) return linuxPath;
        }
      }
    } catch { /* ignore read errors */ }
    return undefined;
  }

  // 1. Bundled .chromium (packaged app)
  const localCache = path.join(__dirname, '..', '.chromium');
  const local = searchCache(localCache);
  if (local) return local;

  // 2. Global puppeteer cache (~/.cache/puppeteer)
  const homeDir = process.env.USERPROFILE || process.env.HOME || '';
  const globalCache = path.join(homeDir, '.cache', 'puppeteer');
  const global = searchCache(globalCache);
  if (global) return global;

  // 3. Common Windows Chrome install paths
  if (isWin) {
    const commonPaths = [
      path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    ];
    for (const p of commonPaths) {
      if (p && fs.existsSync(p)) return p;
    }
  }

  return undefined; // let puppeteer use its default
}

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
    width: '148mm',
    height: '210mm',
    printBackground: true,
    margin: { top: '0', bottom: '0', left: '0', right: '0' },
  });

  return filePath;
}

async function processBatch(task: WorkerTask): Promise<void> {
  const { batch, outputDir, batchIndex } = task;
  const files: string[] = [];
  let completedCount = 0;

  fs.mkdirSync(outputDir, { recursive: true });

  const chromePath = findChromePath();
  const browser = await puppeteer.launch({
    headless: true,
    ...(chromePath ? { executablePath: chromePath } : {}),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 560, height: 794 });

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
          failedId: employee.codeNo,
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
