import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';

import { environment } from '../../environments/environment';
import type { LatLng } from '../models/trip';

import { haversineKm } from './location';

/** Roads are never perfectly straight; this is a common rule-of-thumb detour factor. */
export const DETOUR_FACTOR = 1.3;

export interface RouteResult {
  distanceKm: number;
  durationMin: number;
  path: LatLng[];
  /** "road" = real road distance from OSRM, "straight" = offline estimate. */
  kind: 'road' | 'straight';
}

interface OsrmResponse {
  code: string;
  routes: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[];
}

/** Road distance between two points for Manual mode, from the public OSRM server (HttpClient GET). */
@Service()
export class RoutingService {
  private http = inject(HttpClient);

  async route(from: LatLng, to: LatLng): Promise<RouteResult> {
    const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
    const url = `${environment.osrmUrl}/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    try {
      const res = await firstValueFrom(this.http.get<OsrmResponse>(url).pipe(timeout(10000)));
      const best = res.routes?.[0];
      if (res.code !== 'Ok' || !best) throw new Error(res.code);
      return {
        distanceKm: best.distance / 1000,
        durationMin: best.duration / 60,
        path: best.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
        kind: 'road',
      };
    } catch {
      return this.straightLine(from, to);
    }
  }

  /** Offline fallback: straight-line distance x 1.3, about 20 km/h average tricycle speed. */
  straightLine(from: LatLng, to: LatLng): RouteResult {
    const distanceKm = haversineKm(from, to) * DETOUR_FACTOR;
    return { distanceKm, durationMin: (distanceKm / 20) * 60, path: [from, to], kind: 'straight' };
  }
}
