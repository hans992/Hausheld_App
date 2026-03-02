import type { CalendarEvent } from "./calendar-types";

/** Start of week (Monday) in local date. */
export function getWeekStart(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function getWeekDates(weekStart: Date): Date[] {
  const out: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    out.push(d);
  }
  return out;
}

export function getMonthDates(viewDate: Date): { date: Date; isCurrentMonth: boolean }[] {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const start = getWeekStart(first);
  const end = new Date(getWeekStart(last));
  end.setDate(end.getDate() + 6);
  const out: { date: Date; isCurrentMonth: boolean }[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    out.push({
      date: new Date(cur),
      isCurrentMonth: cur.getMonth() === month,
    });
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/** Parse "HH:mm:ss" or "HH:mm" to minutes since midnight. */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Minutes since midnight from 06:00 (0) to 22:00 (16*60). */
const MIN_MINUTES = 6 * 60;
const MAX_MINUTES = 22 * 60;

/** Fraction of the day column height (0–1) for a time. Clamped to slot range. */
export function timeToFraction(timeMinutes: number): number {
  const clamped = Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, timeMinutes));
  return (clamped - MIN_MINUTES) / (MAX_MINUTES - MIN_MINUTES);
}

export function eventToMinutes(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

/** Events that overlap the given day (by date, not time). */
export function eventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);
  return events.filter((e) => {
    const start = new Date(e.start);
    return start >= dayStart && start <= dayEnd;
  });
}

/** Events that overlap the given day in a week (by date). */
export function eventsForWeekDay(events: CalendarEvent[], dayStart: Date): CalendarEvent[] {
  const dayEnd = new Date(dayStart);
  dayEnd.setHours(23, 59, 59, 999);
  dayStart = new Date(dayStart);
  dayStart.setHours(0, 0, 0, 0);
  return events.filter((e) => {
    const start = new Date(e.start);
    return start >= dayStart && start <= dayEnd;
  });
}

export function formatDayLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

export function formatMonthYear(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function isToday(d: Date): boolean {
  const today = new Date();
  return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

export function addWeeks(d: Date, n: number): Date {
  return addDays(d, n * 7);
}

export function addMonths(d: Date, n: number): Date {
  const out = new Date(d);
  out.setMonth(out.getMonth() + n);
  return out;
}
