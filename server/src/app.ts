try { require('dotenv/config'); } catch { /* no .env in production */ }
import express from 'express';
import cors from 'cors';
import path from 'path';
import authRoutes from './controllers/auth';
import userRoutes from './controllers/users';
import payrollRoutes from './controllers/payroll';
import paysheetRoutes from './controllers/paysheets';
import payslipRoutes from './controllers/payslips';
import dotMatrixRoutes from './controllers/dotMatrix';
import exportRoutes from './controllers/export';
import { authMiddleware } from './middleware/auth';
import { initDatabase } from './services/db';
import logger from './utils/logger';

const app = express();
const PORT = process.env.PORT || 4500;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', `http://localhost:${PORT}`],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve exported files — use writable OUTPUT_DIR if set, else relative
const exportsDir = process.env.OUTPUT_DIR || path.join(__dirname, '..', 'exports');
app.use('/exports', express.static(exportsDir));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/payroll', authMiddleware, payrollRoutes);
app.use('/api/paysheets', authMiddleware, paysheetRoutes);
app.use('/api/payslips', authMiddleware, payslipRoutes);
app.use('/api/dot-matrix', authMiddleware, dotMatrixRoutes);
app.use('/api/export', authMiddleware, exportRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend static files
const clientPath = process.env.CLIENT_PATH || path.join(__dirname, '../../client/dist');
app.use(express.static(clientPath));

// React router fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

// Initialize database and start server
initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      logger.info(`PMS Application Server running on http://localhost:${PORT}`);
      logger.info('Neon PostgreSQL database connected');
      logger.info('Default login: admin / admin123');
    });
  })
  .catch((err) => {
    logger.error('Failed to initialize database:', err);
    logger.error('DATABASE_URL is required. The server cannot start without a database connection.');
    process.exit(1);
  });

export default app;
