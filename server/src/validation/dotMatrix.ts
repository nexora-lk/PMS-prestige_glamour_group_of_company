import { z } from 'zod';

export const generateDotPayslipsSchema = z.object({
  payMonth: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'payMonth must be YYYY-MM format'),
  employeeIds: z
    .array(z.string().min(1))
    .optional()
    .describe('If omitted, generates for all employees with paysheets for the month'),
  useEscP: z
    .boolean()
    .default(false)
    .describe('Include ESC/P control codes for dot matrix formatting'),
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

export type GenerateDotPayslipsInput = z.infer<typeof generateDotPayslipsSchema>;
export type PrintDotPayslipsInput = z.infer<typeof printDotPayslipsSchema>;
