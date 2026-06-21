import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  format,
  parseISO,
} from "date-fns";
import type {
  RecurrenceFrequency,
  RecurrenceRule,
  RecurrenceUnit,
} from "@/types/recurrence";

export const RECURRING_TX_NAMESPACE = "a3b5c7d9-e1f2-4a6b-8c0d-2e4f6a8b0c1d";

export const FREQUENCY_OPTIONS: {
  value: RecurrenceFrequency;
  label: string;
}[] = [
  { value: "daily", label: "Diario" },
  { value: "weekly", label: "Semanal" },
  { value: "biweekly", label: "Quincenal" },
  { value: "monthly", label: "Mensual" },
  { value: "quarterly", label: "Trimestral" },
  { value: "yearly", label: "Anual" },
  { value: "custom", label: "Personalizado" },
];

export const CUSTOM_UNIT_OPTIONS: { value: RecurrenceUnit; label: string }[] =
  [
    { value: "days", label: "días" },
    { value: "weeks", label: "semanas" },
    { value: "months", label: "meses" },
    { value: "years", label: "años" },
  ];

function parseDate(isoDate: string): Date {
  return parseISO(isoDate);
}

function formatDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function unitToFreq(unit: RecurrenceUnit): RecurrenceRule["freq"] {
  switch (unit) {
    case "days":
      return "DAILY";
    case "weeks":
      return "WEEKLY";
    case "months":
      return "MONTHLY";
    case "years":
      return "YEARLY";
  }
}

/** Map preset frequency to an RRULE-compatible rule. */
export function frequencyToRule(
  frequency: RecurrenceFrequency,
  customInterval = 1,
  customUnit: RecurrenceUnit = "months"
): RecurrenceRule {
  switch (frequency) {
    case "daily":
      return { freq: "DAILY", interval: 1 };
    case "weekly":
      return { freq: "WEEKLY", interval: 1 };
    case "biweekly":
      return { freq: "WEEKLY", interval: 2 };
    case "monthly":
      return { freq: "MONTHLY", interval: 1 };
    case "quarterly":
      return { freq: "MONTHLY", interval: 3 };
    case "yearly":
      return { freq: "YEARLY", interval: 1 };
    case "custom":
      return {
        freq: unitToFreq(customUnit),
        interval: Math.max(1, customInterval),
      };
  }
}

/** Compute the next occurrence date after a given date. */
export function computeNextOccurrence(
  fromDate: string,
  rule: RecurrenceRule
): string {
  const base = parseDate(fromDate);
  const interval = Math.max(1, rule.interval);

  let next: Date;
  switch (rule.freq) {
    case "DAILY":
      next = addDays(base, interval);
      break;
    case "WEEKLY":
      next = addWeeks(base, interval);
      break;
    case "MONTHLY":
      next = addMonths(base, interval);
      break;
    case "YEARLY":
      next = addYears(base, interval);
      break;
  }

  return formatDate(next);
}

export function isOccurrenceDue(
  nextDueDate: string,
  today = formatDate(new Date())
): boolean {
  return nextDueDate <= today;
}

export function isPastEndDate(
  endDate: string | null | undefined,
  date: string
): boolean {
  if (!endDate) return false;
  return date > endDate;
}

export function getFrequencyLabel(
  frequency: RecurrenceFrequency,
  rule: RecurrenceRule
): string {
  const preset = FREQUENCY_OPTIONS.find((o) => o.value === frequency);
  if (frequency !== "custom") {
    return preset?.label ?? frequency;
  }

  const unit =
    CUSTOM_UNIT_OPTIONS.find((o) => o.value === ruleFreqToUnit(rule.freq))
      ?.label ?? "meses";
  return `Cada ${rule.interval} ${unit}`;
}

function ruleFreqToUnit(freq: RecurrenceRule["freq"]): RecurrenceUnit {
  switch (freq) {
    case "DAILY":
      return "days";
    case "WEEKLY":
      return "weeks";
    case "MONTHLY":
      return "months";
    case "YEARLY":
      return "years";
  }
}

export function inferCustomUnit(rule: RecurrenceRule): RecurrenceUnit {
  return ruleFreqToUnit(rule.freq);
}

export function inferCustomInterval(rule: RecurrenceRule): number {
  return rule.interval;
}

/** Advance next_due_date until it is after today or recurrence has ended. */
export function advancePastDueDates(
  nextDueDate: string,
  rule: RecurrenceRule,
  endDate: string | null,
  today = formatDate(new Date())
): { nextDueDate: string; lastGeneratedDate: string | null } {
  let current = nextDueDate;
  let lastGenerated: string | null = null;

  while (
    isOccurrenceDue(current, today) &&
    !isPastEndDate(endDate, current)
  ) {
    lastGenerated = current;
    const next = computeNextOccurrence(current, rule);
    if (next === current) break;
    current = next;
    if (isPastEndDate(endDate, current)) break;
  }

  return { nextDueDate: current, lastGeneratedDate: lastGenerated };
}

export function todayIsoDate(): string {
  return formatDate(new Date());
}

/** When editing start/rule, recompute next due from start if needed. */
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
