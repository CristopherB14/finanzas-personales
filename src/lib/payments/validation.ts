import { z } from "zod";

export const createCheckoutBodySchema = z.object({
  account_id: z.string().uuid(),
  category_id: z.string().uuid().nullable().optional(),
  amount_cents: z.number().int().positive(),
  currency_code: z.enum(["ARS", "USD"]),
  description: z.string().trim().min(1).max(256),
  transaction_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/),
  recurring_expense_id: z.string().uuid().nullable().optional(),
  occurrence_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  transaction_client_id: z.string().uuid().optional(),
  original_amount_cents: z.number().int().positive().optional(),
  exchange_rate: z.number().positive().nullable().optional(),
  converted_amount_cents: z.number().int().positive().nullable().optional(),
  exchange_rate_source: z.enum(["bna", "manual"]).nullable().optional(),
});

export type CreateCheckoutBody = z.infer<typeof createCheckoutBodySchema>;
