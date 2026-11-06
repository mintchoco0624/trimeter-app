import { Service, computed, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

import type { Trip } from '../models/trip';

const TRIPS_KEY = 'trimeter.trips';

/**
 * Local data management for trip history, using Capacitor Preferences
 * (key-value storage that survives app restarts; SharedPreferences on Android).
 * All trips are kept as one JSON array under a single key. Newest trip first.
 */
@Service()
export class TripStorageService {
  readonly trips = signal<Trip[]>([]);
  readonly totalKm = computed(() => this.trips().reduce((sum, t) => sum + t.distanceKm, 0));
  readonly totalFare = computed(() => this.trips().reduce((sum, t) => sum + t.fare.total, 0));

  /** READ all trips from storage. */
  async load(): Promise<Trip[]> {
    const { value } = await Preferences.get({ key: TRIPS_KEY });
    const trips = value ? (JSON.parse(value) as Trip[]) : [];
    this.trips.set(trips);
    return trips;
  }

  /** READ one trip. */
  async get(id: string): Promise<Trip | undefined> {
    if (this.trips().length === 0) await this.load();
    return this.trips().find((t) => t.id === id);
  }

  /** CREATE: save a finished trip at the top of the history. */
  async add(trip: Trip): Promise<void> {
    await this.persist([trip, ...this.trips()]);
  }

  /** UPDATE: e.g. store what the driver asked for after the ride. */
  async update(trip: Trip): Promise<void> {
    await this.persist(this.trips().map((t) => (t.id === trip.id ? trip : t)));
  }

  /** DELETE one trip. */
  async remove(id: string): Promise<void> {
    await this.persist(this.trips().filter((t) => t.id !== id));
  }

  /** DELETE all trips. */
  async clear(): Promise<void> {
    await this.persist([]);
  }

  newId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  private async persist(trips: Trip[]): Promise<void> {
    await Preferences.set({ key: TRIPS_KEY, value: JSON.stringify(trips) });
    this.trips.set(trips);
  }
}
