import { Router, Request, Response } from 'express';
import fs from 'fs';
import { generateDotMatrixSchema, printDotPayslipsSchema } from '../validation/dotMatrix';
import {
  startDotMatrixGeneration,
  getDotMatrixJob,
  printDotMatrixFile,
} from '../services/dotMatrixService';
import logger from '../utils/logger';

const router = Router();

// POST /api/dot-matrix/generate — Generate text-based payslips
router.post('/generate', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = generateDotMatrixSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
      res.status(400).json({ error: 'Validation failed', details: errors });
      return;
    }

    const { payMonth, codeNos, useEscP } = parsed.data;
    const { job, skipped } = await startDotMatrixGeneration(payMonth, codeNos, useEscP);

    res.status(202).json({
      message: 'Dot matrix payslip generation started',
      jobId: job.id,
      total: job.total,
      skipped,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start generation';
    logger.error('Dot matrix generation failed', { error: message });
    res.status(409).json({ error: message });
  }
});

// GET /api/dot-matrix/status/:jobId — Poll job progress
router.get('/status/:jobId', (req: Request, res: Response): void => {
  const job = getDotMatrixJob(req.params.jobId);
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  res.json({
    id: job.id,
    status: job.status,
    total: job.total,
    completed: job.completed,
    failed: job.failed,
    progress: job.progress,
    error: job.error,
    payMonth: job.payMonth,
    createdAt: job.createdAt,
  });
});

// GET /api/dot-matrix/download/:jobId — Download the generated text file
router.get('/download/:jobId', (req: Request, res: Response): void => {
  const job = getDotMatrixJob(req.params.jobId);
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  if ((job.status !== 'completed' && job.status !== 'printing') || !job.filePath) {
    res.status(400).json({
      error: 'File not ready',
      status: job.status,
      progress: job.progress,
    });
    return;
  }

  if (!fs.existsSync(job.filePath)) {
    res.status(410).json({ error: 'File has been cleaned up' });
    return;
  }

  const ext = job.filePath.endsWith('.prn') ? '.prn' : '.txt';
  const filename = `payslips_${job.payMonth}${ext}`;
  res.download(job.filePath, filename, (err) => {
    if (err) {
      logger.error('Dot matrix download error', { error: err.message, jobId: job.id });
    }
  });
});

// POST /api/dot-matrix/print — Send generated file to printer
router.post('/print', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = printDotPayslipsSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
      res.status(400).json({ error: 'Validation failed', details: errors });
      return;
    }

    const { jobId, printerName, copies } = parsed.data;
    const result = await printDotMatrixFile(jobId, printerName, copies);

    res.json({ message: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Print failed';
    logger.error('Dot matrix print failed', { error: message });
    res.status(500).json({ error: message });
  }
});

export default router;
