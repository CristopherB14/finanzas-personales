import { v5 as uuidv5 } from "uuid";
import {
  advancePastDueDates,
  computeNextOccurrence,
  isOccurrenceDue,
  isPastEndDate,
  RECURRING_TX_NAMESPACE,
  todayIsoDate,
} from "@/lib/recurrence/engine";
import { updateRecurringExpense } from "@/lib/data/recurring-expenses";
import type { RecurrenceRule } from "@/types/recurrence";
import type { LocalTransaction, RecurringExpense } from "@/types/database";
import type { TransactionInput } from "@/hooks/use-transactions";

export type AddTransactionFn = (
  input: TransactionInput & {
    client_id?: string;
    recurring_expense_id?: string;
    tags?: string[];
  }
) => Promise<LocalTransaction>;

export function recurringOccurrenceClientId(
  recurringClientId: string,
  occurrenceDate: string
): string {
  return uuidv5(`${recurringClientId}:${occurrenceDate}`, RECURRING_TX_NAMESPACE);
}

export function buildExpenseFromRecurring(
  expense: RecurringExpense,
  occurrenceDate: string
): TransactionInput & {
  client_id: string;
  recurring_expense_id: string;
  tags: string[];
} {
  return {
    account_id: expense.account_id,
    category_id: expense.category_id,
    type: "expense",
    amount_cents: expense.amount_cents,
    currency_code: expense.currency_code,
    transaction_date: occurrenceDate,
    description: expense.name,
    client_id: recurringOccurrenceClientId(expense.client_id, occurrenceDate),
    recurring_expense_id: expense.id,
    tags: ["recurring"],
  };
}

export type RecurringExpenseStatus = "overdue" | "upcoming" | "inactive";

export function getRecurringExpenseStatus(
  expense: RecurringExpense,
  today = todayIsoDate()
): RecurringExpenseStatus {
  if (!expense.is_active) return "inactive";
  if (isOccurrenceDue(expense.next_due_date, today)) return "overdue";
  return "upcoming";
}

export async function processAutoCreateRecurringExpenses(opts: {
  expenses: RecurringExpense[];
  existingClientIds: Set<string>;
  addTransaction: AddTransactionFn;
  today?: string;
}): Promise<number> {
  const today = opts.today ?? todayIsoDate();
  let processed = 0;

  for (const expense of opts.expenses) {
    if (!expense.is_active || !expense.auto_create) continue;

    let current = { ...expense };

    while (
      isOccurrenceDue(current.next_due_date, today) &&
      !isPastEndDate(current.end_date, current.next_due_date)
    ) {
      const occurrenceDate = current.next_due_date;
      const txInput = buildExpenseFromRecurring(current, occurrenceDate);

      if (!opts.existingClientIds.has(txInput.client_id)) {
        await opts.addTransaction(txInput);
        opts.existingClientIds.add(txInput.client_id);
        processed++;
      }

      const nextDue = computeNextOccurrence(
        occurrenceDate,
        current.recurrence_rule
      );

      current = await updateRecurringExpense(current.user_id, current.id, {
        next_due_date: nextDue,
        last_generated_date: occurrenceDate,
      });

      if (isPastEndDate(current.end_date, current.next_due_date)) {
        break;
      }
    }
  }

  return processed;
}

export async function confirmRecurringOccurrence(opts: {
  expense: RecurringExpense;
  existingClientIds: Set<string>;
  addTransaction: AddTransactionFn;
}): Promise<LocalTransaction | null> {
  const { expense } = opts;
  const occurrenceDate = expense.next_due_date;
  const txInput = buildExpenseFromRecurring(expense, occurrenceDate);

  if (opts.existingClientIds.has(txInput.client_id)) {
    const nextDue = computeNextOccurrence(
      occurrenceDate,
      expense.recurrence_rule
    );
    await updateRecurringExpense(expense.user_id, expense.id, {
      next_due_date: nextDue,
      last_generated_date: occurrenceDate,
    });
    return null;
  }

  const tx = await opts.addTransaction(txInput);
  opts.existingClientIds.add(txInput.client_id);

  const nextDue = computeNextOccurrence(
    occurrenceDate,
    expense.recurrence_rule
  );

  await updateRecurringExpense(expense.user_id, expense.id, {
    next_due_date: nextDue,
    last_generated_date: occurrenceDate,
  });

  return tx;
}

export function resolveNextDueDate(input: {
  start_date: string;
  next_due_date?: string;
  recurrence_rule: RecurrenceRule;
  end_date: string | null;
}): string {
  const candidate = input.next_due_date ?? input.start_date;
  if (isPastEndDate(input.end_date, candidate)) {
    return input.end_date ?? candidate;
  }
  const { nextDueDate } = advancePastDueDates(
    candidate,
    input.recurrence_rule,
    input.end_date
  );
  return nextDueDate;
}
