import type { FareBreakdown } from '../models/fare-matrix';
import type { Trip } from '../models/trip';

import { DEFAULT_QUERY, isFiltered, queryTrips, rangeStart } from './trip-query';

const NOW = new Date('2026-11-07T15:00:00+08:00');

function trip(id: string, startedAt: string, from: string, to: string, km: number, total: number): Trip {
  return {
    id,
    mode: 'auto',
    startedAt,
    endedAt: startedAt,
    durationSec: 600,
    distanceKm: km,
    passengerType: 'regular',
    fare: { total } as FareBreakdown,
    from: { lat: 0, lng: 0, label: from },
    to: { lat: 0, lng: 0, label: to },
    route: [],
    distanceSource: 'GPS',
    matrixVersion: 'test',
  };
}

const trips: Trip[] = [
  trip('a', '2026-11-07T09:00:00+08:00', 'NE Pacific Mall', 'NEUST', 4.56, 45),
  trip('b', '2026-11-05T09:00:00+08:00', 'SM City Cabanatuan', 'Bitas', 2.1, 35),
  trip('c', '2026-10-20T09:00:00+08:00', 'Public Market', 'NE Pacific Mall', 7.2, 60),
  trip('d', '2026-09-01T09:00:00+08:00', 'Sumacab', 'Kapitan Pepe', 5.0, 45),
];

describe('queryTrips', () => {
  it('sorts newest first by default and keeps every trip', () => {
    expect(queryTrips(trips, DEFAULT_QUERY, NOW).map((t) => t.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('searches origin and destination names, ignoring case', () => {
    const ids = queryTrips(trips, { ...DEFAULT_QUERY, text: 'pacific' }, NOW).map((t) => t.id);
    expect(ids).toEqual(['a', 'c']);
  });

  it('filters by date range', () => {
    const ids = (range: 'today' | 'week' | 'month') =>
      queryTrips(trips, { ...DEFAULT_QUERY, range }, NOW).map((t) => t.id);
    expect(ids('today')).toEqual(['a']);
    expect(ids('week')).toEqual(['a', 'b']);
    expect(ids('month')).toEqual(['a', 'b', 'c']);
  });

  it('sorts by oldest, highest fare and longest distance', () => {
    const ids = (sort: 'oldest' | 'fare' | 'distance') =>
      queryTrips(trips, { ...DEFAULT_QUERY, sort }, NOW).map((t) => t.id);
    expect(ids('oldest')).toEqual(['d', 'c', 'b', 'a']);
    expect(ids('fare')).toEqual(['c', 'a', 'd', 'b']); // equal fares: newer first
    expect(ids('distance')).toEqual(['c', 'd', 'a', 'b']);
  });

  it('does not change the saved array', () => {
    const copy = [...trips];
    queryTrips(trips, { ...DEFAULT_QUERY, sort: 'oldest' }, NOW);
    expect(trips).toEqual(copy);
  });

  it('reports when a filter is active', () => {
    expect(isFiltered(DEFAULT_QUERY)).toBe(false);
    expect(isFiltered({ ...DEFAULT_QUERY, sort: 'fare' })).toBe(false);
    expect(isFiltered({ ...DEFAULT_QUERY, text: 'sm' })).toBe(true);
    expect(isFiltered({ ...DEFAULT_QUERY, range: 'week' })).toBe(true);
  });

  it('"today" starts at local midnight', () => {
    const start = new Date(rangeStart('today', NOW)!);
    expect(start.getHours()).toBe(0);
    expect(start.getDate()).toBe(NOW.getDate());
  });
});
