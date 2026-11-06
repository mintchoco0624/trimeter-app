import { Service, computed, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Geolocation, type Position } from '@capacitor/geolocation';

import type { LatLng, TrackPoint } from '../models/trip';

/** Fixes less accurate than this (in metres) are not used for distance. */
export const MAX_ACCURACY_M = 35;
/** Movements shorter than this (in metres) are treated as GPS jitter while standing still. */
export const MIN_STEP_M = 5;
/** Anything faster than this (m/s, about 108 km/h) is a GPS jump, not a tricycle. */
export const MAX_SPEED_MS = 30;

export type FixDecision = { accept: true; stepM: number } | { accept: false; reason: 'inaccurate' | 'jitter' | 'jump' };

/** Great-circle distance between two coordinates, in kilometres (haversine formula). */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371; // Earth radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Decides whether a new GPS fix should extend the route. Pure, so it can be unit-tested. */
export function judgeFix(prev: TrackPoint | undefined, next: TrackPoint): FixDecision {
  if (next.acc > MAX_ACCURACY_M) return { accept: false, reason: 'inaccurate' };
  if (!prev) return { accept: true, stepM: 0 };

  const stepM = haversineKm(prev, next) * 1000;
  if (stepM < MIN_STEP_M) return { accept: false, reason: 'jitter' };

  const seconds = Math.max(1, (next.t - prev.t) / 1000);
  if (stepM / seconds > MAX_SPEED_MS) return { accept: false, reason: 'jump' };

  return { accept: true, stepM };
}

/**
 * Wraps the Capacitor Geolocation plugin: permissions, one-off position, and live tracking.
 * The meter page reads the signals below; they update every time an accepted fix arrives.
 */
@Service()
export class LocationService {
  readonly tracking = signal(false);
  readonly points = signal<TrackPoint[]>([]);
  readonly distanceKm = signal(0);
  readonly lastFix = signal<TrackPoint | null>(null);
  readonly weakSignal = signal(false);
  readonly error = signal<string | null>(null);
  readonly hasFix = computed(() => this.lastFix() !== null);

  private watchId: string | null = null;
  private wakeLock: WakeLockSentinel | null = null;

  /** Asks for location permission if needed. Throws a readable message when it is refused. */
  async ensurePermission(): Promise<void> {
    let status;
    try {
      status = await Geolocation.checkPermissions();
    } catch {
      throw new Error('Location is turned off. Turn on Location (GPS) in your phone settings, then try again.');
    }
    // In a browser the permission prompt appears by itself on the first GPS request.
    if (!Capacitor.isNativePlatform()) {
      if (status.location === 'denied')
        throw new Error('Location is blocked for this site. Allow it in the browser settings.');
      return;
    }
    if (status.location !== 'granted') {
      status = await Geolocation.requestPermissions({ permissions: ['location'] });
    }
    if (status.location !== 'granted') {
      throw new Error(
        'TriMeter needs location permission to measure the trip. Allow it in Settings > Apps > TriMeter > Permissions.',
      );
    }
  }

  async getCurrent(): Promise<TrackPoint> {
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
    return this.toPoint(pos);
  }

  /** Starts a new trip: clears the old route and listens for GPS updates. */
  async start(): Promise<void> {
    await this.ensurePermission();
    this.reset();
    this.tracking.set(true);
    await this.keepScreenOn();
    this.watchId = await Geolocation.watchPosition(
      // interval / minimumUpdateInterval are Android-only: ask for a fix about every 2 seconds.
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0, interval: 2000, minimumUpdateInterval: 1000 },
      (pos, err) => {
        if (err || !pos) {
          this.error.set('Waiting for GPS signal…');
          return;
        }
        this.error.set(null);
        this.addFix(this.toPoint(pos));
      },
    );
  }

  async stop(): Promise<void> {
    if (this.watchId) {
      await Geolocation.clearWatch({ id: this.watchId });
      this.watchId = null;
    }
    this.tracking.set(false);
    await this.releaseScreen();
  }

  reset(): void {
    this.points.set([]);
    this.distanceKm.set(0);
    this.lastFix.set(null);
    this.weakSignal.set(false);
    this.error.set(null);
  }

  /** Adds a fix to the route if it passes the accuracy, jitter and jump checks. */
  addFix(fix: TrackPoint): void {
    const route = this.points();
    const decision = judgeFix(route.at(-1), fix);
    this.weakSignal.set(fix.acc > MAX_ACCURACY_M);
    this.lastFix.set(fix);
    if (!decision.accept) return;

    this.points.set([...route, fix]);
    this.distanceKm.update((km) => km + decision.stepM / 1000);
  }

  private toPoint(pos: Position): TrackPoint {
    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      acc: pos.coords.accuracy ?? 999,
      t: pos.timestamp,
    };
  }

  /** Keeps the screen awake during a trip (Screen Wake Lock API), because GPS pauses when the app sleeps. */
  private async keepScreenOn(): Promise<void> {
    try {
      this.wakeLock = (await navigator.wakeLock?.request('screen')) ?? null;
    } catch {
      this.wakeLock = null; // not supported or not allowed: the trip still works
    }
  }

  private async releaseScreen(): Promise<void> {
    try {
      await this.wakeLock?.release();
    } finally {
      this.wakeLock = null;
    }
  }
}
