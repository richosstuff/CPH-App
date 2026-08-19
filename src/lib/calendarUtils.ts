import type { CalendarEvent } from './types';

/** Sorted by time when set (nulls last), position as the manual tiebreaker/fallback order. */
export function sortDayEvents(evs: CalendarEvent[]): CalendarEvent[] {
  return [...evs].sort((a, b) => {
    if (a.time && b.time) return a.time.localeCompare(b.time) || a.position - b.position;
    if (a.time) return -1;
    if (b.time) return 1;
    return a.position - b.position;
  });
}
