export type EventRecurrenceInput = {
  enabled: boolean;
  by_weekday: number[];
  until_date: string;
  interval_weeks?: number;
};

export type EventOccurrenceInput = {
  starts_at: string;
  ends_at: string;
  additional_dates: string[];
  recurrence?: EventRecurrenceInput | null;
};

export type EventOccurrence = {
  starts: Date;
  ends: Date | null;
};

const MAX_OCCURRENCES = 104;

export function parseLocalDatetime(value: string): Date {
  return new Date(value);
}

function toIsoDateLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function shiftToDate(base: Date, isoDate: string): Date {
  const [y, m, day] = isoDate.split("-").map(Number);
  return new Date(
    y,
    m - 1,
    day,
    base.getHours(),
    base.getMinutes(),
    base.getSeconds(),
    base.getMilliseconds(),
  );
}

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function occurrenceKey(d: Date): string {
  return d.toISOString();
}

function expandWeeklyRecurrence(
  start: Date,
  durationMs: number | null,
  recurrence: EventRecurrenceInput,
): EventOccurrence[] {
  if (!recurrence.enabled || recurrence.by_weekday.length === 0 || !recurrence.until_date) {
    return [];
  }

  const weekdaySet = new Set(recurrence.by_weekday);
  const until = parseIsoDate(recurrence.until_date);
  until.setHours(23, 59, 59, 999);

  const results: EventOccurrence[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const primaryIso = toIsoDateLocal(start);

  while (cursor <= until && results.length < MAX_OCCURRENCES) {
    const iso = toIsoDateLocal(cursor);
    if (weekdaySet.has(cursor.getDay()) && iso !== primaryIso) {
      const occurrenceStart = iso === primaryIso ? start : shiftToDate(start, iso);
      const occurrenceEnd =
        durationMs != null ? new Date(occurrenceStart.getTime() + durationMs) : null;
      results.push({ starts: occurrenceStart, ends: occurrenceEnd });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return results;
}

export function buildEventOccurrences(input: EventOccurrenceInput): EventOccurrence[] {
  const starts = parseLocalDatetime(input.starts_at);
  const ends = input.ends_at ? parseLocalDatetime(input.ends_at) : null;
  if (ends && ends.getTime() <= starts.getTime()) {
    throw new Error("End date/time must be after start date/time.");
  }

  const durationMs = ends != null ? ends.getTime() - starts.getTime() : null;
  const primaryIso = toIsoDateLocal(starts);
  const extra = input.additional_dates.filter((d) => d && d !== primaryIso);

  const map = new Map<string, EventOccurrence>();

  function add(occ: EventOccurrence) {
    map.set(occurrenceKey(occ.starts), occ);
  }

  add({ starts, ends });

  for (const iso of extra) {
    const occurrenceStart = shiftToDate(starts, iso);
    const occurrenceEnd =
      durationMs != null ? new Date(occurrenceStart.getTime() + durationMs) : null;
    add({ starts: occurrenceStart, ends: occurrenceEnd });
  }

  if (input.recurrence?.enabled) {
    for (const occ of expandWeeklyRecurrence(starts, durationMs, input.recurrence)) {
      add(occ);
    }
  }

  if (map.size > MAX_OCCURRENCES) {
    throw new Error(`Too many dates (max ${MAX_OCCURRENCES}). Shorten recurrence or remove extra dates.`);
  }

  return [...map.values()].sort((a, b) => a.starts.getTime() - b.starts.getTime());
}

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
