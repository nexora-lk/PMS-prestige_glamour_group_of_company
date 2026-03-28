import { Router, Request, Response } from 'express';
import path from 'path';
import { readJSON } from '../services/jsonStore';
import { exportUsersToExcel, exportPayrollToExcel } from '../utils/excelExport';
import { User, PayrollRecord } from '../models';

const router = Router();

// GET /api/export/users-excel — Export users to Excel
router.get('/users-excel', async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = readJSON<User>('users.json');
    if (users.length === 0) {
      res.status(400).json({ error: 'No user data to export.' });
      return;
    }

    const filePath = await exportUsersToExcel(users);
    res.download(filePath, path.basename(filePath), (err) => {
      if (err) {
        console.error('Download error:', err);
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export users.' });
  }
});

// GET /api/export/payroll-excel — Export payroll to Excel
router.get('/payroll-excel', async (_req: Request, res: Response): Promise<void> => {
  try {
    const records = readJSON<PayrollRecord>('payroll.json');
    if (records.length === 0) {
      res.status(400).json({ error: 'No payroll data to export.' });
      return;
    }

    const filePath = await exportPayrollToExcel(records);
    res.download(filePath, path.basename(filePath), (err) => {
      if (err) {
        console.error('Download error:', err);
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export payroll.' });
  }
});

// POST /api/export/backup — Google Drive backup placeholder
router.post('/backup', async (_req: Request, res: Response): Promise<void> => {
  try {
    // Placeholder for Google Drive backup
    // In production, this would use Google Drive API with OAuth2
    res.json({
      message: 'Google Drive backup feature requires OAuth2 setup. See README for configuration.',
      status: 'not_configured',
      instructions: [
        '1. Create a Google Cloud project',
        '2. Enable Google Drive API',
        '3. Create OAuth2 credentials',
        '4. Set environment variables: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET',
        '5. Complete the OAuth consent flow',
      ],
    });
  } catch (error) {
    res.status(500).json({ error: 'Backup failed.' });
  }
});

export default router;
