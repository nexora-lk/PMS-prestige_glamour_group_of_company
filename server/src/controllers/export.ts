import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import { dbGetAllUsers, dbGetAllPaysheets, dbGetPaysheetsByMonth } from '../services/dbStore';
import { exportUsersToExcel, exportMonthlyPaysheetsToExcel, exportMonthlyPaysheetsByBranchToExcel, exportMonthlyPaysheetsByRoleToExcel } from '../utils/excelExport';

const router = Router();

// GET /api/export/users-excel — Export users to Excel
router.get('/users-excel', async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await dbGetAllUsers();
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

// GET /api/export/paysheets-excel — Export monthly paysheets to Excel
router.get('/paysheets-excel', async (_req: Request, res: Response): Promise<void> => {
  try {
    const records = await dbGetAllPaysheets();
    if (records.length === 0) {
      res.status(400).json({ error: 'No monthly paysheet data to export.' });
      return;
    }

    const users = await dbGetAllUsers();
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

// GET /api/export/paysheets-excel-by-role — Export monthly paysheets to Excel organized by Role
router.get('/paysheets-excel-by-role', async (_req: Request, res: Response): Promise<void> => {
  try {
    const records = await dbGetAllPaysheets();
    if (records.length === 0) {
      res.status(400).json({ error: 'No monthly paysheet data to export.' });
      return;
    }

    const users = await dbGetAllUsers();
    const filePath = await exportMonthlyPaysheetsByRoleToExcel(records, users);
    res.download(filePath, path.basename(filePath), (err) => {
      if (err) {
        console.error('Download error:', err);
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export monthly paysheets by role.' });
  }
});

// GET /api/export/paysheets-excel-by-branch — Export monthly paysheets to Excel organized by Branch
router.get('/paysheets-excel-by-branch', async (_req: Request, res: Response): Promise<void> => {
  try {
    const records = await dbGetAllPaysheets();
    if (records.length === 0) {
      res.status(400).json({ error: 'No monthly paysheet data to export.' });
      return;
    }

    const users = await dbGetAllUsers();
    const filePath = await exportMonthlyPaysheetsByBranchToExcel(records, users);
    res.download(filePath, path.basename(filePath), (err) => {
      if (err) {
        console.error('Download error:', err);
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export monthly paysheets by branch.' });
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

    const allForMonth = await dbGetPaysheetsByMonth(payMonth);
    const users = await dbGetAllUsers();
    const userMap = new Map(users.map((u) => [u.codeNo, u]));

    if (allForMonth.length === 0) {
      res.status(400).json({ error: `No paysheet data found for ${payMonth}` });
      return;
    }

    // Skip paysheets with achievedSalary = 0
    const skipped = allForMonth.filter((r) => !r.achievedSalary || r.achievedSalary === 0);
    const filtered = allForMonth.filter((r) => r.achievedSalary && r.achievedSalary > 0);
    if (filtered.length === 0) {
      res.status(400).json({ error: `All paysheets for ${payMonth} have achievedSalary = 0. Cannot export.` });
      return;
    }

    // Create temp directory for JSON files
    const tempDir = path.join(process.env.TEMP_DIR || path.join(__dirname, '..', '..', 'temp'), `json_export_${Date.now()}`);
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
          codeNo: record.codeNo, name: employeeName,
          firstName: user?.firstName || '', lastName: user?.lastName || '',
          designation: user?.designation || record.role, branch: user?.branch || '',
          role: record.role, bankName: user?.bankName || '', bankAccount: user?.bankAccount || '',
          email: user?.email || '', phone: user?.phone || '',
        },
        paysheet: {
          payMonth: record.payMonth, monthsOfService: record.monthsOfService,
          basicSalary: record.basicSalary || 0, assignedTarget: record.assignedTarget || 0,
          achieve: record.achieve || 0, achievementPct: record.achievementPct || 0,
        },
        earnings: {
          basicOffers: record.achieve || 0, vehicleAllowance: record.vehicleAllowance || 0,
          fuelAllowance: record.fuelAllowance || 0, generalAllowance: record.generalAllowance || 0,
          orc: record.orc || 0, otherOffer: record.otherOffer || 0,
          customEarningName: record.customEarningName || '', customEarningAmount: record.customEarningAmount || 0,
          grossSalary: record.grossSalary || 0,
        },
        deductions: {
          epfEmployee: record.epfEmployee || 0, nopayDeduction: record.nopayDeduction || 0,
          lateDeduction: record.lateDeduction || 0, welfare: record.welfare || 0,
          customDeductionName: record.customDeductionName || '', customDeductionAmount: record.customDeductionAmount || 0,
        },
        employerContributions: { epfEmployer: record.epfEmployer || 0, etf: record.etf || 0 },
        summary: {
          grossSalary: record.grossSalary || 0,
          totalDeductions: (record.epfEmployee || 0) + (record.nopayDeduction || 0) +
            (record.lateDeduction || 0) + (record.welfare || 0) + (record.customDeductionAmount || 0),
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
    if (skipped.length > 0) {
      const skippedNames = skipped.map((r) => {
        const u = userMap.get(r.codeNo);
        return u ? `${u.firstName} ${u.lastName} (${r.codeNo})` : r.codeNo;
      });
      res.setHeader('X-Skipped-Count', String(skipped.length));
      res.setHeader('X-Skipped-Names', encodeURIComponent(skippedNames.join(', ')));
      res.setHeader('Access-Control-Expose-Headers', 'X-Skipped-Count, X-Skipped-Names');
    }

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
