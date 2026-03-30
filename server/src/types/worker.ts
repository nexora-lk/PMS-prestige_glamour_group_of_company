export interface PayslipEmployee {
  id: string;
  codeNo: string;
  firstName: string;
  lastName: string;
  designation: string;
  branch: string;
  payMonth: string;
  basicSalary: number;
  vehicleAllowance: number;
  fuelAllowance: number;
  generalAllowance: number;
  orc: number;
  otherOffer: number;
  grossSalary: number;
  epfEmployee: number;
  epfEmployer: number;
  etf: number;
  nopayDeduction: number;
  lateDeduction: number;
  welfare: number;
  netSalary: number;
  achievementPct: number;
  assignedTarget: number;
  createdAt: string;
}

export interface WorkerTask {
  type: 'render';
  batch: PayslipEmployee[];
  outputDir: string;
  batchIndex: number;
}

export interface WorkerProgress {
  type: 'progress';
  completed: number;
  batchIndex: number;
}

export interface WorkerDone {
  type: 'done';
  files: string[];
  batchIndex: number;
}

export interface WorkerError {
  type: 'error';
  message: string;
  batchIndex: number;
  failedId?: string;
}

export type WorkerMessage = WorkerProgress | WorkerDone | WorkerError;

export type JobStatus = 'pending' | 'processing' | 'zipping' | 'completed' | 'failed';

export interface Job {
  id: string;
  status: JobStatus;
  total: number;
  completed: number;
  failed: number;
  progress: number;
  zipPath: string | null;
  error: string | null;
  createdAt: string;
}
