import type { Trip } from '../models/trip';

/** Date filter on the History screen. Ranges count back from now. */
export type DateRange = 'all' | 'today' | 'week' | 'month';
export type TripSort = 'newest' | 'oldest' | 'fare' | 'distance';

export interface TripQuery {
  /** Matches the origin or destination name (case-insensitive). */
  text: string;
  range: DateRange;
  sort: TripSort;
}

export const DEFAULT_QUERY: TripQuery = { text: '', range: 'all', sort: 'newest' };

export const RANGE_LABELS: Record<DateRange, string> = {
  all: 'All dates',
  today: 'Today',
  week: 'Last 7 days',
  month: 'Last 30 days',
};

export const SORT_LABELS: Record<TripSort, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  fare: 'Highest fare',
  distance: 'Longest distance',
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Earliest start time allowed by a date range, or null for "all". */
export function rangeStart(range: DateRange, now: Date): number | null {
  if (range === 'all') return null;
  if (range === 'today') {
    const midnight = new Date(now);
    midnight.setHours(0, 0, 0, 0);
    return midnight.getTime();
  }
  return now.getTime() - (range === 'week' ? 7 : 30) * DAY_MS;
}

/**
 * Search, filter and sort trips for the History screen. Pure (no Angular), so it is unit-tested.
 * Returns a new array; the saved history is never changed.
 */
export function queryTrips(trips: readonly Trip[], query: TripQuery, now = new Date()): Trip[] {
  const text = query.text.trim().toLowerCase();
  const since = rangeStart(query.range, now);

  const matches = trips.filter((t) => {
    if (since !== null && new Date(t.startedAt).getTime() < since) return false;
    if (!text) return true;
    const places = [t.from.label, t.to.label, t.destination?.label ?? ''].join(' ').toLowerCase();
    return places.includes(text);
  });

  const time = (t: Trip) => new Date(t.startedAt).getTime();
  const sorters: Record<TripSort, (a: Trip, b: Trip) => number> = {
    newest: (a, b) => time(b) - time(a),
    oldest: (a, b) => time(a) - time(b),
    fare: (a, b) => b.fare.total - a.fare.total || time(b) - time(a),
    distance: (a, b) => b.distanceKm - a.distanceKm || time(b) - time(a),
  };
  return matches.sort(sorters[query.sort]);
}

/** True when any filter is active, so the screen can offer "Clear filters". */
export function isFiltered(query: TripQuery): boolean {
  return query.text.trim() !== '' || query.range !== 'all';
}
