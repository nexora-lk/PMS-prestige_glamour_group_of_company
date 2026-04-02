import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { generatePayslipsSchema, printPayslipsSchema } from '../validation/payslip';
import { startPayslipGeneration, getJob, printPayslips } from '../services/payslipService';
import logger from '../utils/logger';

const router = Router();

// POST /api/payslips/generate — Start bulk payslip PDF generation
router.post('/generate', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = generatePayslipsSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
      res.status(400).json({ error: 'Validation failed', details: errors });
      return;
    }

    const { payMonth, codeNos, concurrency } = parsed.data;
    const { job, skipped } = await startPayslipGeneration(payMonth, codeNos, concurrency);

    res.status(202).json({
      message: 'Payslip generation started',
      jobId: job.id,
      total: job.total,
      skipped,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start generation';
    logger.error('Generate payslips failed', { error: message });
    res.status(409).json({ error: message });
  }
});

// GET /api/payslips/progress/:jobId — Poll job progress
router.get('/progress/:jobId', (req: Request, res: Response): void => {
  const job = getJob(req.params.jobId);
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
    createdAt: job.createdAt,
  });
});

// GET /api/payslips/download/:jobId — Download the generated ZIP
router.get('/download/:jobId', (req: Request, res: Response): void => {
  const job = getJob(req.params.jobId);
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  if (job.status !== 'completed' || !job.zipPath) {
    res.status(400).json({
      error: 'ZIP not ready',
      status: job.status,
      progress: job.progress,
    });
    return;
  }

  if (!fs.existsSync(job.zipPath)) {
    res.status(410).json({ error: 'ZIP file has been cleaned up' });
    return;
  }

  const filename = `payslips_${job.id.slice(0, 8)}.zip`;
  res.download(job.zipPath, filename, (err) => {
    if (err) {
      logger.error('Download error', { error: err.message, jobId: job.id });
    }
  });
});

// POST /api/payslips/print — Send generated PDFs to printer
router.post('/print', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = printPayslipsSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
      res.status(400).json({ error: 'Validation failed', details: errors });
      return;
    }

    const { jobId, printerName, copies } = parsed.data;
    const result = await printPayslips(jobId, printerName, copies);

    res.json({ message: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Print failed';
    logger.error('PDF print failed', { error: message });
    res.status(500).json({ error: message });
  }
});

export default router;
