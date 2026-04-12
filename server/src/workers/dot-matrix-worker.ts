import { parentPort } from 'worker_threads';
import fs from 'fs';
import { renderDotMatrixPayslip, payslipSeparator, ESCP } from '../templates/dotMatrixPayslip';
import type { DotMatrixTask, DotMatrixMessage } from '../types/dotMatrix';

async function processBatch(task: DotMatrixTask): Promise<void> {
  const { batch, outputPath, batchIndex, useEscP } = task;
  let linesWritten = 0;
  let completedCount = 0;

  // Use streaming write — never hold all payslips in memory
  const stream = fs.createWriteStream(outputPath, { flags: 'w', encoding: useEscP ? 'binary' : 'utf8' });

  await new Promise<void>((resolve, reject) => {
    stream.on('error', reject);

    let idx = 0;

    function writeNext(): void {
      let canContinue = true;

      while (idx < batch.length && canContinue) {
        const employee = batch[idx];
        idx++;

        try {
          const payslipText = renderDotMatrixPayslip(employee, useEscP);
          const separator = idx < batch.length
            ? (useEscP ? '' : payslipSeparator())  // ESC/P uses form feed built into template
            : '';

          canContinue = stream.write(payslipText + separator);

          linesWritten += 66;
          completedCount++;

          // Report progress
          const progress: DotMatrixMessage = {
            type: 'progress',
            completed: completedCount,
            batchIndex,
          };
          parentPort?.postMessage(progress);
        } catch (err) {
          const errorMsg: DotMatrixMessage = {
            type: 'error',
            message: `Failed to render payslip for ${employee.codeNo}: ${err instanceof Error ? err.message : String(err)}`,
            batchIndex,
            failedId: employee.codeNo,
          };
          parentPort?.postMessage(errorMsg);
        }
      }

      if (idx >= batch.length) {
        stream.end(() => resolve());
      } else if (!canContinue) {
        // Backpressure: wait for drain before continuing
        stream.once('drain', writeNext);
      }
    }

    writeNext();
  });

  // Signal completion
  const done: DotMatrixMessage = { type: 'done', linesWritten, batchIndex };
  parentPort?.postMessage(done);
}

// Listen for tasks from main thread
parentPort?.on('message', (task: DotMatrixTask) => {
  if (task.type === 'generate') {
    processBatch(task).catch((err) => {
      const msg: DotMatrixMessage = {
        type: 'error',
        message: `Worker crashed: ${err instanceof Error ? err.message : String(err)}`,
        batchIndex: task.batchIndex,
      };
      parentPort?.postMessage(msg);
    });
  }
});
