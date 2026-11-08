import { Service } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

import type { PassengerType } from '../models/fare-matrix';
import type { AppRole } from '../models/profile';
import type { Place, TrackPoint, TripEstimate } from '../models/trip';

const KEY = 'trimeter.activeTrip';

/** A trip older than this is not offered for resuming (nobody rides a tricycle for 12 hours). */
export const MAX_RESUME_AGE_MS = 12 * 60 * 60 * 1000;

/** Everything needed to continue a trip after the app was closed or crashed. */
export interface ActiveTrip {
  startedAt: number;
  /** When this snapshot was written (Unix ms). */
  savedAt: number;
  points: TrackPoint[];
  distanceKm: number;
  passenger: PassengerType;
  role: AppRole;
  startPlace?: Place;
  destination?: Place;
  estimate?: TripEstimate;
}

/**
 * Keeps a copy of the trip in progress in Capacitor Preferences, so a crash, a phone restart or
 * closing the app does not lose the ride. The Meter saves a snapshot every few seconds and clears it
 * when the trip ends or is discarded.
 */
@Service()
export class TripRecoveryService {
  async save(trip: ActiveTrip): Promise<void> {
    await Preferences.set({ key: KEY, value: JSON.stringify(trip) });
  }

  /** The unfinished trip, or null when there is none, it is unreadable, or it is too old to resume. */
  async load(now = Date.now()): Promise<ActiveTrip | null> {
    const { value } = await Preferences.get({ key: KEY });
    if (!value) return null;
    try {
      const trip = JSON.parse(value) as ActiveTrip;
      const valid = Array.isArray(trip.points) && Number.isFinite(trip.distanceKm) && Number.isFinite(trip.startedAt);
      if (valid && now - trip.savedAt <= MAX_RESUME_AGE_MS) return trip;
    } catch {
      // corrupt snapshot: fall through and remove it
    }
    await this.clear();
    return null;
  }

  async clear(): Promise<void> {
    await Preferences.remove({ key: KEY });
  }
}
