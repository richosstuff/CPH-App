import type { Phase } from './types';

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** The most recent phase whose start_date has already passed. */
export function getCurrentPhase(phases: Phase[]): Phase | null {
  const today = todayISO();
  const started = phases
    .filter((p) => p.start_date <= today)
    .sort((a, b) => b.start_date.localeCompare(a.start_date));
  return started[0] ?? phases[0] ?? null;
}

export function daysUntil(dateISO: string): number {
  const target = new Date(dateISO + 'T00:00:00');
  const today = new Date(todayISO() + 'T00:00:00');
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function daysSince(dateISO: string): number {
  return -daysUntil(dateISO);
}

/** Monday of the current week, as an ISO date string. */
export function currentWeekStart(): string {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  now.setDate(now.getDate() + diff);
  return now.toISOString().slice(0, 10);
}

export function addDays(dateISO: string, days: number): string {
  const d = new Date(dateISO + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function formatShortDate(dateISO: string): string {
  return new Date(dateISO + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

/** First day of the current month, as an ISO date string — the key used by monthly_finance rows. */
export function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

/** Formats a Date using its LOCAL calendar fields — unlike toISOString, this never shifts across a UTC day boundary. */
export function toLocalISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** A fixed 6-week (42-day) Monday-start grid of dates covering the given month, including lead-in/lead-out days. */
export function monthGridDays(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - startOffset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}
