import type { ElementRef, OnDestroy } from '@angular/core';
import { Component, afterNextRender, effect, input, output, signal, viewChild } from '@angular/core';
import * as L from 'leaflet';

import { environment } from '../../../environments/environment';
import type { LatLng } from '../../models/trip';

/** Centre of Cabanatuan City (around the public market / city proper). */
export const CABANATUAN: LatLng = { lat: 15.4866, lng: 120.9667 };

/**
 * Leaflet map used by the meter, estimate and receipt screens.
 * Inputs are signals: when the parent updates `route` or `current`, the map redraws.
 */
@Component({
  selector: 'app-trip-map',
  templateUrl: './trip-map.component.html',
  styleUrls: ['./trip-map.component.scss'],
})
export class TripMapComponent implements OnDestroy {
  /** Points of the route drawn as a line. */
  readonly route = input<LatLng[]>([]);
  /** A planned road route (dashed), shown before the trip starts. */
  readonly plan = input<LatLng[]>([]);
  /** The user's live position (pulsing dot). */
  readonly current = input<LatLng | null>(null);
  readonly from = input<LatLng | null>(null);
  readonly to = input<LatLng | null>(null);
  /** Keep the live position in view while it moves. */
  readonly follow = input(false);
  /** Zoom to show the whole route whenever it changes. */
  readonly fitRoute = input(false);
  /** Where the OpenStreetMap credit goes; move it when a panel covers the bottom of the map. */
  readonly attributionPosition = input<L.ControlPosition>('bottomright');
  /** False when the page shows the OpenStreetMap credit itself (e.g. in a bottom panel that covers the map). */
  readonly showAttribution = input(true);
  readonly mapClick = output<LatLng>();

  private readonly container = viewChild.required<ElementRef<HTMLDivElement>>('map');
  private readonly ready = signal(false);

  private map?: L.Map;
  private line?: L.Polyline;
  private planLine?: L.Polyline;
  private here?: L.Marker;
  private start?: L.Marker;
  private end?: L.Marker;
  private resizeObserver?: ResizeObserver;

  constructor() {
    // Leaflet needs a real DOM element with a size, so create the map after rendering.
    afterNextRender(() => this.createMap());

    effect(() => {
      if (!this.ready() || !this.map) return;
      const route = this.route();
      this.line!.setLatLngs(route.map((p) => [p.lat, p.lng]));
      if (this.fitRoute() && route.length > 1) {
        this.map.fitBounds(this.line!.getBounds(), { padding: [40, 40], maxZoom: 17 });
      }
    });

    effect(() => {
      if (!this.ready() || !this.map) return;
      const plan = this.plan();
      this.planLine!.setLatLngs(plan.map((p) => [p.lat, p.lng]));
      // The plan is shown on the Meter, where a search card covers the top and the fare sheet the bottom.
      if (plan.length > 1) {
        this.map.fitBounds(this.planLine!.getBounds(), {
          paddingTopLeft: [40, 150],
          paddingBottomRight: [40, 330],
          maxZoom: 16,
        });
      }
    });

    effect(() => {
      if (!this.ready() || !this.map) return;
      const pos = this.current();
      this.here = this.placeMarker(this.here, pos, 'here');
      if (pos && this.follow()) this.map.panTo([pos.lat, pos.lng], { animate: true });
    });

    effect(() => {
      if (!this.ready() || !this.map) return;
      this.start = this.placeMarker(this.start, this.from(), 'from', 'A');
      this.end = this.placeMarker(this.end, this.to(), 'to', 'B');
    });
  }

  /** Moves the map to a point (used by "Locate me"). */
  centerOn(p: LatLng, zoom = 16): void {
    this.map?.setView([p.lat, p.lng], zoom, { animate: true });
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.map?.remove();
  }

  private createMap(): void {
    const el = this.container().nativeElement;
    this.map = L.map(el, { zoomControl: false, attributionControl: false }).setView(
      [CABANATUAN.lat, CABANATUAN.lng],
      14,
    );
    if (this.showAttribution()) {
      L.control.attribution({ position: this.attributionPosition(), prefix: false }).addTo(this.map);
    }
    L.tileLayer(environment.tileUrl, {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    this.planLine = L.polyline([], { color: '#24419B', weight: 5, opacity: 0.55, dashArray: '8 10' }).addTo(this.map);
    this.line = L.polyline([], { color: '#24419B', weight: 6, opacity: 0.9, lineCap: 'round' }).addTo(this.map);
    this.map.on('click', (e: L.LeafletMouseEvent) => this.mapClick.emit({ lat: e.latlng.lat, lng: e.latlng.lng }));

    // Ionic animates pages in, so the size can change after creation: tell Leaflet to re-measure.
    this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize());
    this.resizeObserver.observe(el);
    this.ready.set(true);
  }

  /** Creates, moves or removes a marker. Uses HTML markers so no image files are needed. */
  private placeMarker(marker: L.Marker | undefined, pos: LatLng | null, kind: string, text = ''): L.Marker | undefined {
    if (!pos) {
      marker?.remove();
      return undefined;
    }
    if (marker) return marker.setLatLng([pos.lat, pos.lng]);
    const icon = L.divIcon({
      className: `tm-marker tm-marker--${kind}`,
      html: `<span>${text}</span>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
    return L.marker([pos.lat, pos.lng], { icon, keyboard: false }).addTo(this.map!);
  }
}
