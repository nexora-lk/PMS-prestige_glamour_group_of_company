import { z } from 'zod';

export const generateDotMatrixSchema = z.object({
  payMonth: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'payMonth must be YYYY-MM format'),
  codeNos: z
    .array(z.string().min(1))
    .optional()
    .describe('If omitted, generates for all active employees with paysheets for the month'),
  useEscP: z
    .boolean()
    .optional()
    .default(true)
});

export const printDotPayslipsSchema = z.object({
  jobId: z.string().min(1, 'jobId is required'),
  printerName: z
    .string()
    .optional()
    .describe('Printer name. If omitted, uses system default printer'),
  copies: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(1),
});

export type GenerateDotMatrixInput = z.infer<typeof generateDotMatrixSchema>;
export type PrintDotPayslipsInput = z.infer<typeof printDotPayslipsSchema>;
