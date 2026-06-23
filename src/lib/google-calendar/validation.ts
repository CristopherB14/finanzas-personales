import { z } from "zod";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
// RRULE values are placed inside the Google event JSON body. JSON.stringify
// neutralizes structural injection, but we still constrain the charset and
// length to reject obviously malformed/abusive input.
const RRULE_SAFE = /^[A-Z0-9=;:,\-+/]+$/;

const recurrenceRuleSchema = z.object({
  freq: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]),
  interval: z.number().int().min(1).max(1000),
  until: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

const recurrenceSchema = z.union([
  z.string().max(500).regex(RRULE_SAFE),
  recurrenceRuleSchema,
]);

export const calendarEventInputSchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().max(2000).optional(),
  amount: z.number().finite().min(0).max(1_000_000_000_000),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2,8}$/)
    .optional(),
  date: z.string().regex(ISO_DATE),
  type: z.enum(["income", "expense", "recurring"]),
  recurrence: recurrenceSchema.optional(),
});

export const createEventBodySchema = z.object({
  user_id: z.string().uuid().optional(),
  client_id: z.string().uuid().optional(),
  transaction: calendarEventInputSchema,
});

export type CreateEventBody = z.infer<typeof createEventBodySchema>;
