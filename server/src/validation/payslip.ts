import { z } from 'zod';

export const generatePayslipsSchema = z.object({
  payMonth: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'payMonth must be YYYY-MM format'),
  employeeIds: z
    .array(z.string().min(1))
    .optional()
    .describe('If omitted, generates for all active employees with paysheets for the month'),
  concurrency: z
    .number()
    .int()
    .min(1)
    .max(10)
    .default(5)
    .describe('Number of parallel worker threads'),
});

export type GeneratePayslipsInput = z.infer<typeof generatePayslipsSchema>;
