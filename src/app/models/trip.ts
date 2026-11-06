import type { FareBreakdown, PassengerType } from './fare-matrix';

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
}
