import { FastifyInstance } from 'fastify';
import fs from 'fs';
import { generateDotMatrixSchema, printDotPayslipsSchema } from '../../validation/dotMatrix';
import {
  startDotMatrixGeneration,
  getDotMatrixJob,
  printDotMatrixFile,
} from '../../services/dotMatrixService';
import logger from '../../utils/logger';

export default async function dotMatrixRoutes(fastify: FastifyInstance): Promise<void> {

  // POST /generate
  fastify.post<{ Body: unknown }>('/generate', async (request, reply) => {
    try {
      const parsed = generateDotMatrixSchema.safeParse(request.body);
      if (!parsed.success) {
        const errors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
        return reply.code(400).send({ error: 'Validation failed', details: errors });
      }

      const { payMonth, codeNos, useEscP } = parsed.data;
      const { job, skipped } = await startDotMatrixGeneration(payMonth, codeNos, useEscP);

      return reply.code(202).send({
        message: 'Dot matrix payslip generation started',
        jobId: job.id,
        total: job.total,
        skipped,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start generation';
      logger.error('Dot matrix generation failed', { error: message });
      return reply.code(409).send({ error: message });
    }
  });

  // GET /status/:jobId
  fastify.get<{ Params: { jobId: string } }>('/status/:jobId', async (request, reply) => {
    const job = getDotMatrixJob(request.params.jobId);
    if (!job) return reply.code(404).send({ error: 'Job not found' });

    return reply.send({
      id: job.id, status: job.status, total: job.total,
      completed: job.completed, failed: job.failed,
      progress: job.progress, error: job.error,
      payMonth: job.payMonth, createdAt: job.createdAt,
    });
  });

  // GET /download/:jobId
  fastify.get<{ Params: { jobId: string } }>('/download/:jobId', async (request, reply) => {
    const job = getDotMatrixJob(request.params.jobId);
    if (!job) return reply.code(404).send({ error: 'Job not found' });

    if ((job.status !== 'completed' && job.status !== 'printing') || !job.filePath) {
      return reply.code(400).send({ error: 'File not ready', status: job.status, progress: job.progress });
    }

    if (!fs.existsSync(job.filePath)) {
      return reply.code(410).send({ error: 'File has been cleaned up' });
    }

    const ext = job.filePath.endsWith('.prn') ? '.prn' : '.txt';
    const filename = `payslips_${job.payMonth}${ext}`;
    const stat = fs.statSync(job.filePath);

    reply.header('Content-Type', 'application/octet-stream');
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    reply.header('Content-Length', String(stat.size));

    return reply.send(fs.createReadStream(job.filePath));
  });

  // POST /print
  fastify.post<{ Body: unknown }>('/print', async (request, reply) => {
    try {
      const parsed = printDotPayslipsSchema.safeParse(request.body);
      if (!parsed.success) {
        const errors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
        return reply.code(400).send({ error: 'Validation failed', details: errors });
      }

      const { jobId, printerName, copies } = parsed.data;
      const result = await printDotMatrixFile(jobId, printerName, copies);
      return reply.send({ message: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Print failed';
      logger.error('Dot matrix print failed', { error: message });
      return reply.code(500).send({ error: message });
    }
  });
}
