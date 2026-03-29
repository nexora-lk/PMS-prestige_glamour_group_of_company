import express from 'express';
import cors from 'cors';
import path from 'path';
import authRoutes from './controllers/auth';
import userRoutes from './controllers/users';
import payrollRoutes from './controllers/payroll';
import paysheetRoutes from './controllers/paysheets';
import exportRoutes from './controllers/export';
import { authMiddleware } from './middleware/auth';

const app = express();
const PORT = process.env.PORT || 4500;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve exported files
app.use('/exports', express.static(path.join(__dirname, '..', 'exports')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/payroll', authMiddleware, payrollRoutes);
app.use('/api/paysheets', authMiddleware, paysheetRoutes);
app.use('/api/export', authMiddleware, exportRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend static files
const clientPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientPath));

// React router fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 PMS Application Server running on http://localhost:${PORT}`);
  console.log(`📁 Data stored in: ${path.join(__dirname, '..', 'data')}`);
  console.log(`🔐 Default login: admin / admin123\n`);
});

export default app;
