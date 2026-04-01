import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import { readJSON } from '../services/jsonStore';
import { exportUsersToExcel, exportMonthlyPaysheetsToExcel } from '../utils/excelExport';
import { User, MonthlyPaysheetDTO } from '../models';

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

// GET /api/export/paysheets-excel — Export monthly paysheets to Excel (one sheet per month, role-wise sections)
router.get('/paysheets-excel', async (_req: Request, res: Response): Promise<void> => {
  try {
    const records = readJSON<MonthlyPaysheetDTO>('monthly-paysheets.json');
    if (records.length === 0) {
      res.status(400).json({ error: 'No monthly paysheet data to export.' });
      return;
    }

    const users = readJSON<User>('users.json');
    const filePath = await exportMonthlyPaysheetsToExcel(records, users);
    res.download(filePath, path.basename(filePath), (err) => {
      if (err) {
        console.error('Download error:', err);
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export monthly paysheets.' });
  }
});

// GET /api/export/paysheets-json?payMonth=YYYY-MM — Export each paysheet as individual JSON in a ZIP
router.get('/paysheets-json', async (req: Request, res: Response): Promise<void> => {
  try {
    const payMonth = req.query.payMonth as string;
    if (!payMonth) {
      res.status(400).json({ error: 'payMonth query parameter is required (e.g. 2026-03)' });
      return;
    }

    const records = readJSON<MonthlyPaysheetDTO>('monthly-paysheets.json');
    const users = readJSON<User>('users.json');
    const userMap = new Map(users.map((u) => [u.codeNo, u]));

    const filtered = records.filter((r) => r.payMonth === payMonth);
    if (filtered.length === 0) {
      res.status(400).json({ error: `No paysheet data found for ${payMonth}` });
      return;
    }

    // Create temp directory for JSON files
    const tempDir = path.join(__dirname, '..', '..', 'temp', `json_export_${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    // Create individual JSON files
    for (const record of filtered) {
      const user = userMap.get(record.codeNo);
      const employeeName = user ? `${user.firstName} ${user.lastName}` : record.codeNo;

      const jsonData = {
        export: {
          generatedAt: new Date().toISOString(),
          payMonth: record.payMonth,
          exportType: 'monthly-paysheet',
          company: 'Prestige Glamour Working Capital Solutions (Pvt) Ltd',
        },
        employee: {
          codeNo: record.codeNo,
          name: employeeName,
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
          designation: user?.designation || record.role,
          branch: user?.branch || '',
          role: record.role,
          bankName: user?.bankName || '',
          bankAccount: user?.bankAccount || '',
          email: user?.email || '',
          phone: user?.phone || '',
        },
        paysheet: {
          payMonth: record.payMonth,
          monthsOfService: record.monthsOfService,
          basicSalary: record.basicSalary || 0,
          assignedTarget: record.assignedTarget || 0,
          achieve: record.achieve || 0,
          achievementPct: record.achievementPct || 0,
        },
        earnings: {
          basicOffers: record.achieve || 0,
          vehicleAllowance: record.vehicleAllowance || 0,
          fuelAllowance: record.fuelAllowance || 0,
          generalAllowance: record.generalAllowance || 0,
          orc: record.orc || 0,
          otherOffer: record.otherOffer || 0,
          customEarningName: record.customEarningName || '',
          customEarningAmount: record.customEarningAmount || 0,
          grossSalary: record.grossSalary || 0,
        },
        deductions: {
          epfEmployee: record.epfEmployee || 0,
          nopayDeduction: record.nopayDeduction || 0,
          lateDeduction: record.lateDeduction || 0,
          welfare: record.welfare || 0,
          customDeductionName: record.customDeductionName || '',
          customDeductionAmount: record.customDeductionAmount || 0,
        },
        employerContributions: {
          epfEmployer: record.epfEmployer || 0,
          etf: record.etf || 0,
        },
        summary: {
          grossSalary: record.grossSalary || 0,
          totalDeductions:
            (record.epfEmployee || 0) +
            (record.nopayDeduction || 0) +
            (record.lateDeduction || 0) +
            (record.welfare || 0) +
            (record.customDeductionAmount || 0),
          netSalary: record.netSalary || 0,
        },
      };

      const safeName = `${record.codeNo}_${employeeName.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const filePath = path.join(tempDir, `${safeName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2), 'utf-8');
    }

    // Create ZIP
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="paysheets_json_${payMonth}.zip"`);

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to create ZIP' });
      }
    });

    archive.pipe(res);
    archive.directory(tempDir, false);
    await archive.finalize();

    // Cleanup temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (error) {
    console.error('JSON export error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to export paysheets as JSON.' });
    }
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
