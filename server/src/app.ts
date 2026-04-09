import path from 'path';
import Fastify from 'fastify';
import staticPlugin from '@fastify/static';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import compress from '@fastify/compress';

import { ENV } from './config/env';
import corsPlugin from './plugins/cors';

// ── Module routes ────────────────────────────────────────────
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/users.routes';
import payrollRoutes from './modules/payroll/payroll.routes';
import paysheetRoutes from './modules/payroll/paysheets.routes';
import payslipRoutes from './modules/payslips/payslips.routes';
import dotMatrixRoutes from './modules/payslips/dotMatrix.routes';
import exportRoutes from './modules/payslips/export.routes';

import { authMiddleware } from './modules/auth/auth.service';
import { ensureAdmin } from './modules/auth/auth.routes';
import { initDatabase } from './services/db';
import logger from './utils/logger';

const app = Fastify({
  logger: true,
  bodyLimit: 1_048_576
}); // 1 MB body limit

// ── Plugins ──────────────────────────────────────────────────
app.register(corsPlugin);
app.register(compress, { global: true });
app.register(helmet, {
  contentSecurityPolicy: false, // enable and tune per your frontend needs
});

// ── Serve exported files ─────────────────────────────────────
const exportsDir = ENV.OUTPUT_DIR || path.join(__dirname, '..', 'exports');
app.register(staticPlugin, {
  root: exportsDir,
  prefix: '/exports/',
  decorateReply: true,
});

// Strict limit on login — 5 attempts per 15 minutes per IP
app.register(rateLimit, {
  max: 5,
  timeWindow: '15 minutes',
  keyGenerator: (req) => req.ip,
  errorResponseBuilder: () => ({
    error: 'Too many login attempts. Try again in 15 minutes.',
  }),
});

// ── Public routes ────────────────────────────────────────────
app.register(authRoutes, { prefix: '/api/auth' });

// ── Protected routes ─────────────────────────────────────────
app.register(async (fastify) => {
  fastify.addHook('preHandler', authMiddleware);
  fastify.register(userRoutes,      { prefix: '/users' });
  fastify.register(payrollRoutes,   { prefix: '/payroll' });
  fastify.register(paysheetRoutes,  { prefix: '/paysheets' });
  fastify.register(payslipRoutes,   { prefix: '/payslips' });
  fastify.register(dotMatrixRoutes, { prefix: '/dot-matrix' });
  fastify.register(exportRoutes,    { prefix: '/export' });
}, { prefix: '/api' });

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', async (_request, reply) => {
  return reply.send({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Serve frontend static files ───────────────────────────────
const clientPath = ENV.CLIENT_PATH || path.join(__dirname, '../../client/dist');
app.register(staticPlugin, {
  root: clientPath,
  prefix: '/',
  decorateReply: false,
});

// ── React router fallback ─────────────────────────────────────
app.setNotFoundHandler(async (_request, reply) => {
  return reply.sendFile('index.html', clientPath);
});

// ── Bootstrap ─────────────────────────────────────────────────
initDatabase()
  .then(async () => {
    await ensureAdmin();
    app.listen({ port: ENV.PORT, host: '0.0.0.0' }, (err) => {
      if (err) {
        logger.error('Server failed to start:', err);
        process.exit(1);
      }
      logger.info(`PMS Application Server running on http://localhost:${ENV.PORT}`);
      logger.info('Neon PostgreSQL database connected');
      logger.info('Default login: admin / admin123');
    });
  })
  .catch((err) => {
    logger.error('Failed to initialize database:', err);
    process.exit(1);
  });

export default app;
