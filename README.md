# PMS-prestige_glamour_group_of_company


  1. dist/PMS Application Setup 1.0.0.exe — NSIS installer (with install directory choice, desktop shortcut, etc.)
  2. dist/PMS Application-1.0.0-win.zip — ZIP portable version
  3. dist/PMS Application 1.0.0.exe — Portable executable

 Bulk PDF Export

  - UI: Payroll page → "Bulk PDF Export" tab
  - Flow: Select month → configure workers (1-10) → generate → download ZIP of all payslips
  - API: POST /api/payslips/generate → poll progress → GET /api/payslips/download/:jobId
  - Also supports: direct printing to a connected printer

  Bulk Dot Matrix Printing

  - UI: Dedicated DotMatrixPrinting page
  - Flow: Select month → toggle ESC/P mode (for Epson printers) → generate → download .txt/.prn file
  - API: POST /api/dot-matrix/generate → poll status → GET /api/dot-matrix/download/:jobId
  - Also supports: direct printing to a dot matrix printer

  Both use worker threads for parallel processing with progress tracking and error handling. The worker path bug we just fixed was preventing these from working 
  — they should now work correctly in both development and production (packaged .exe).