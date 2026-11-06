import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { catchError, firstValueFrom, map, of, timeout } from 'rxjs';

import { environment } from '../../environments/environment';
import type { LatLng, Place } from '../models/trip';

interface NominatimAddress {
  amenity?: string;
  shop?: string;
  building?: string;
  road?: string;
  neighbourhood?: string;
  quarter?: string;
  suburb?: string;
  village?: string;
  city?: string;
  town?: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  address?: NominatimAddress;
}

/** Cabanatuan City area, used to keep search results local (left, top, right, bottom). */
const CABANATUAN_VIEWBOX = '120.88,15.58,121.06,15.40';

/**
 * Place names from OpenStreetMap Nominatim (HttpClient GET, no API key).
 * Called only at the start and end of a trip, to respect Nominatim's 1 request/second policy.
 */
@Service()
export class GeocodeService {
  private http = inject(HttpClient);

  /** Coordinates -> short place name, e.g. "SM City Cabanatuan, Bitas". Never throws. */
  reverse(point: LatLng): Promise<Place> {
    const params = new HttpParams()
      .set('format', 'jsonv2')
      .set('lat', point.lat)
      .set('lon', point.lng)
      .set('zoom', 17)
      .set('addressdetails', 1)
      .set('accept-language', 'en');

    const request = this.http.get<NominatimResult>(`${environment.nominatimUrl}/reverse`, { params }).pipe(
      timeout(8000),
      map((res) => ({ ...point, label: this.shortName(res) })),
      catchError(() => of({ ...point, label: this.coordsLabel(point) })),
    );
    return firstValueFrom(request);
  }

  /** Text search limited to Cabanatuan, for the manual estimate screen. */
  search(query: string): Promise<Place[]> {
    const params = new HttpParams()
      .set('format', 'jsonv2')
      .set('q', query)
      .set('viewbox', CABANATUAN_VIEWBOX)
      .set('bounded', 1)
      .set('limit', 6)
      .set('addressdetails', 1)
      .set('accept-language', 'en');

    const request = this.http.get<NominatimResult[]>(`${environment.nominatimUrl}/search`, { params }).pipe(
      timeout(8000),
      map((list) => list.map((r) => ({ lat: +r.lat, lng: +r.lon, label: this.shortName(r) }))),
    );
    return firstValueFrom(request);
  }

  coordsLabel(p: LatLng): string {
    return `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;
  }

  private shortName(r: NominatimResult): string {
    const a = r.address ?? {};
    const place = r.name || a.amenity || a.shop || a.building || a.road;
    const area = a.neighbourhood || a.quarter || a.suburb || a.village || a.city || a.town;
    const parts = [place, area].filter((x, i, arr): x is string => !!x && arr.indexOf(x) === i);
    return parts.length ? parts.join(', ') : r.display_name.split(',').slice(0, 2).join(',');
  }
}
