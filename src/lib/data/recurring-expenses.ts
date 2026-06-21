import { v4 as uuidv4 } from "uuid";
import { createClient } from "@/lib/supabase/client";
import {
  frequencyToRule,
  resolveNextDueDate,
} from "@/lib/recurrence/engine";
import type {
  RecurrenceFrequency,
  RecurrenceRule,
  RecurrenceUnit,
} from "@/types/recurrence";
import type { RecurringExpense } from "@/types/database";

export type RecurringExpenseInput = {
  name: string;
  amount_cents: number;
  category_id: string;
  account_id: string;
  currency_code?: string;
  start_date: string;
  end_date?: string | null;
  frequency: RecurrenceFrequency;
  recurrence_rule?: RecurrenceRule;
  custom_interval?: number;
  custom_unit?: RecurrenceUnit;
  next_due_date?: string;
  last_generated_date?: string | null;
  auto_create?: boolean;
  reminder_enabled?: boolean;
  notes?: string | null;
  is_active?: boolean;
  timezone?: string;
};

function buildRecurrenceRule(input: RecurringExpenseInput): RecurrenceRule {
  if (input.recurrence_rule) return input.recurrence_rule;
  return frequencyToRule(
    input.frequency,
    input.custom_interval,
    input.custom_unit
  );
}

export async function fetchRecurringExpenses(
  userId: string
): Promise<RecurringExpense[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("recurring_expenses")
    .select("*")
    .eq("user_id", userId)
    .order("next_due_date");

  if (error) throw error;
  return (data ?? []) as RecurringExpense[];
}

export async function fetchRecurringExpenseById(
  userId: string,
  id: string
): Promise<RecurringExpense | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("recurring_expenses")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as RecurringExpense | null) ?? null;
}

export async function createRecurringExpense(
  userId: string,
  input: RecurringExpenseInput
): Promise<RecurringExpense> {
  const supabase = createClient();
  const recurrence_rule = buildRecurrenceRule(input);
  const next_due_date = resolveNextDueDate({
    start_date: input.start_date,
    next_due_date: input.next_due_date ?? input.start_date,
    recurrence_rule,
    end_date: input.end_date ?? null,
  });

  const { data, error } = await supabase
    .from("recurring_expenses")
    .insert({
      user_id: userId,
      client_id: uuidv4(),
      name: input.name.trim(),
      amount_cents: input.amount_cents,
      category_id: input.category_id,
      account_id: input.account_id,
      currency_code: input.currency_code ?? "ARS",
      start_date: input.start_date,
      end_date: input.end_date ?? null,
      frequency: input.frequency,
      recurrence_rule,
      next_due_date,
      auto_create: input.auto_create ?? false,
      reminder_enabled: input.reminder_enabled ?? true,
      notes: input.notes?.trim() || null,
      is_active: input.is_active ?? true,
      timezone: input.timezone ?? "America/Argentina/Buenos_Aires",
      sync_metadata: {},
    })
    .select()
    .single();

  if (error) throw error;
  return data as RecurringExpense;
}

export async function updateRecurringExpense(
  userId: string,
  id: string,
  input: Partial<RecurringExpenseInput>
): Promise<RecurringExpense> {
  const supabase = createClient();
  const existing = await fetchRecurringExpenseById(userId, id);
  if (!existing) throw new Error("Gasto recurrente no encontrado");

  const frequency = input.frequency ?? existing.frequency;
  const start_date = input.start_date ?? existing.start_date;
  const end_date =
    input.end_date !== undefined ? input.end_date : existing.end_date;

  const recurrence_rule =
    input.recurrence_rule ??
    (input.frequency || input.custom_interval || input.custom_unit
      ? buildRecurrenceRule({
          name: existing.name,
          amount_cents: existing.amount_cents,
          category_id: existing.category_id,
          account_id: existing.account_id,
          start_date,
          frequency,
          custom_interval: input.custom_interval,
          custom_unit: input.custom_unit,
        })
      : existing.recurrence_rule);

  const patch: Record<string, unknown> = {};

  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.amount_cents !== undefined) patch.amount_cents = input.amount_cents;
  if (input.category_id !== undefined) patch.category_id = input.category_id;
  if (input.account_id !== undefined) patch.account_id = input.account_id;
  if (input.currency_code !== undefined) patch.currency_code = input.currency_code;
  if (input.start_date !== undefined) patch.start_date = input.start_date;
  if (input.end_date !== undefined) patch.end_date = input.end_date;
  if (input.frequency !== undefined) patch.frequency = input.frequency;
  if (
    input.frequency !== undefined ||
    input.custom_interval !== undefined ||
    input.custom_unit !== undefined ||
    input.recurrence_rule !== undefined
  ) {
    patch.recurrence_rule = recurrence_rule;
  }
  if (input.auto_create !== undefined) patch.auto_create = input.auto_create;
  if (input.reminder_enabled !== undefined) {
    patch.reminder_enabled = input.reminder_enabled;
  }
  if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;
  if (input.is_active !== undefined) patch.is_active = input.is_active;
  if (input.timezone !== undefined) patch.timezone = input.timezone;
  if (input.last_generated_date !== undefined) {
    patch.last_generated_date = input.last_generated_date;
  }

  if (
    input.next_due_date !== undefined ||
    input.start_date !== undefined ||
    input.frequency !== undefined ||
    input.custom_interval !== undefined ||
    input.custom_unit !== undefined ||
    input.end_date !== undefined
  ) {
    patch.next_due_date = resolveNextDueDate({
      start_date,
      next_due_date: input.next_due_date ?? existing.next_due_date,
      recurrence_rule,
      end_date,
    });
  }

  const { data, error } = await supabase
    .from("recurring_expenses")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as RecurringExpense;
}

export async function deleteRecurringExpense(
  userId: string,
  id: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("recurring_expenses")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);

  if (error) throw error;
}
