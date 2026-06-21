/** Preset frequency selector stored on recurring_expenses.frequency */
export type RecurrenceFrequency =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "yearly"
  | "custom";

/** Unit for custom recurrence intervals */
export type RecurrenceUnit = "days" | "weeks" | "months" | "years";

/**
 * RRULE-compatible recurrence rule (RFC 5545 subset).
 * Stored as JSONB for future Google Calendar synchronization.
 */
export interface RecurrenceRule {
  /** RRULE FREQ */
  freq: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  /** RRULE INTERVAL (default 1) */
  interval: number;
  /** RRULE UNTIL equivalent — ISO date YYYY-MM-DD */
  until?: string;
  /** Future: RRULE BYDAY */
  byDay?: string[];
  /** Future: RRULE BYMONTHDAY */
  byMonthDay?: number[];
}

/** Metadata for external calendar sync (Google Calendar, etc.) */
export interface RecurringExpenseSyncMetadata {
  google_calendar_event_id?: string | null;
  google_calendar_calendar_id?: string | null;
  last_synced_at?: string | null;
  sync_status?: "none" | "pending" | "synced" | "error";
  etag?: string | null;
}
