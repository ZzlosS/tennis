// Times travel as UTC, and a court's rules (opening hours, "the day") are in its own time zone.
// This works out local days and hours with Intl, so no date library is needed.

export const HOUR_MS = 3_600_000;
export const DAY_MS = 24 * HOUR_MS;
export const DEFAULT_TIME_ZONE = "Europe/Belgrade";

import type { OpeningHours } from "../responses/common";

export type { OpeningHours };

export const DEFAULT_OPENING_HOURS: OpeningHours = Array.from({ length: 7 }, () => ({ open: "06:00", close: "23:00" }));

export interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  // 0 is Monday.
  weekday: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatter(timeZone: string): Intl.DateTimeFormat {
  let found = formatters.get(timeZone);
  if (!found) {
    found = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      weekday: "short",
    });
    formatters.set(timeZone, found);
  }
  return found;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    formatter(timeZone);
    return true;
  } catch {
    return false;
  }
}

export function localParts(date: Date, timeZone: string): LocalParts {
  const parts: Record<string, string> = {};
  for (const part of formatter(timeZone).formatToParts(date)) {
    parts[part.type] = part.value;
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24,
    weekday: WEEKDAYS.indexOf(parts.weekday),
  };
}

// How far the zone is ahead of UTC at this moment, in milliseconds.
function offsetMs(date: Date, timeZone: string): number {
  const parts: Record<string, string> = {};
  for (const part of formatter(timeZone).formatToParts(date)) {
    parts[part.type] = part.value;
  }
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second)
  );
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

// The UTC moment at which the wall clock in `timeZone` shows this date and hour.
// Day and month may overflow (day 32 is the 1st of next month). A time skipped by a clock change moves forward.
export function zonedTimeToUtc(year: number, month: number, day: number, hour: number, timeZone: string): Date {
  const guess = Date.UTC(year, month - 1, day, hour);
  const first = guess - offsetMs(new Date(guess), timeZone);
  const second = guess - offsetMs(new Date(first), timeZone);
  return new Date(second);
}

// Local midnight at the start of "YYYY-MM-DD" and at the start of the next day.
export function localDayRange(date: string, timeZone: string): { start: Date; end: Date } {
  const [year, month, day] = date.split("-").map(Number);
  return {
    start: zonedTimeToUtc(year, month, day, 0, timeZone),
    end: zonedTimeToUtc(year, month, day + 1, 0, timeZone),
  };
}

// The same wall-clock time some local days later (a weekly booking stays at 18:00 across a clock change).
export function addLocalDays(date: Date, days: number, timeZone: string): Date {
  const local = localParts(date, timeZone);
  return zonedTimeToUtc(local.year, local.month, local.day + days, local.hour, timeZone);
}

// "YYYY-MM-DD" of the moment in the zone.
export function localDate(date: Date, timeZone: string): string {
  const local = localParts(date, timeZone);
  return `${String(local.year).padStart(4, "0")}-${String(local.month).padStart(2, "0")}-${String(local.day).padStart(2, "0")}`;
}

export const isIsoDate = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

export const utcHours = (startsAt: Date, endsAt: Date): Date[] => {
  const hours: Date[] = [];
  for (let time = startsAt.getTime(); time < endsAt.getTime(); time += HOUR_MS) {
    hours.push(new Date(time));
  }
  return hours;
};

export const hourOf = (value: string): number => Number(value.slice(0, 2));

// Is the hour that starts at this moment inside the opening hours?
export function isOpenAt(hours: OpeningHours, date: Date, timeZone: string): boolean {
  const local = localParts(date, timeZone);
  const day = hours[local.weekday];
  return day != null && local.hour >= hourOf(day.open) && local.hour < hourOf(day.close);
}
