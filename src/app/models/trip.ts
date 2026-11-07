import type { FareBreakdown, PassengerType } from './fare-matrix';
import type { AppRole } from './profile';

export interface LatLng {
  lat: number;
  lng: number;
}

/** A GPS fix we kept for the route. `t` is a Unix time in ms, `acc` the accuracy in metres. */
export interface TrackPoint extends LatLng {
  t: number;
  acc: number;
}

export interface Place extends LatLng {
  label: string;
}

/** auto = measured live with GPS; manual = estimated from two points on the map. */
export type TripMode = 'auto' | 'manual';

/** completed = a metered GPS ride; estimate = a manual estimate saved for reference. */
export type TripStatus = 'completed' | 'estimate';

export const STATUS_LABELS: Record<TripStatus, string> = {
  completed: 'Completed',
  estimate: 'Estimate',
};

/** A fare preview made before the ride (commuter picked a destination on the Meter). */
export interface TripEstimate {
  distanceKm: number;
  durationMin: number;
  fare: number;
  /** "road" = OSRM road distance, "straight" = offline straight-line x1.3. */
  kind: 'road' | 'straight';
}

export interface Trip {
  id: string;
  mode: TripMode;
  startedAt: string;
  endedAt: string;
  durationSec: number;
  distanceKm: number;
  passengerType: PassengerType;
  fare: FareBreakdown;
  from: Place;
  to: Place;
  route: LatLng[];
  /** How the distance was measured, e.g. "GPS", "Road route (OSRM)", "Straight line x1.3". */
  distanceSource: string;
  matrixVersion: string;
  /** What the driver actually asked for, entered by the passenger after the ride. */
  driverAsked?: number;
  /** Who recorded the trip. Missing on trips saved before roles existed (treated as commuter). */
  role?: AppRole;
  /** Missing on older trips: derived from `mode` by tripStatus(). */
  status?: TripStatus;
  /** The destination the commuter picked before the ride, and the fare preview for it. */
  destination?: Place;
  estimate?: TripEstimate;
}

/** Status of any trip, including ones saved before the `status` field existed. */
export function tripStatus(trip: Pick<Trip, 'status' | 'mode'>): TripStatus {
  return trip.status ?? (trip.mode === 'manual' ? 'estimate' : 'completed');
}
