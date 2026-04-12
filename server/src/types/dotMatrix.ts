import type { PayslipEmployee } from './worker';

// ── Worker communication ────────────────────────────────────

export interface DotMatrixTask {
  type: 'generate';
  batch: PayslipEmployee[];
  outputPath: string;
  batchIndex: number;
  useEscP: boolean;
}

export interface DotMatrixProgress {
  type: 'progress';
  completed: number;
  batchIndex: number;
}

export interface DotMatrixDone {
  type: 'done';
  linesWritten: number;
  batchIndex: number;
}

export interface DotMatrixError {
  type: 'error';
  message: string;
  batchIndex: number;
  failedId?: string;
}

export type DotMatrixMessage = DotMatrixProgress | DotMatrixDone | DotMatrixError;

// ── Job tracking ────────────────────────────────────────────

export type DotMatrixJobStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'printing';

export interface DotMatrixJob {
  id: string;
  status: DotMatrixJobStatus;
  total: number;
  completed: number;
  failed: number;
  progress: number;
  filePath: string | null;
  error: string | null;
  payMonth: string;
  createdAt: string;
}

// ── Printer config ──────────────────────────────────────────

export interface PrintRequest {
  jobId: string;
  printerName?: string;
  copies?: number;
}
