import type { ElementRef, OnDestroy } from '@angular/core';
import { Component, afterNextRender, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cloudOfflineOutline } from 'ionicons/icons';
import * as L from 'leaflet';

import { environment } from '../../../environments/environment';
import type { LatLng } from '../../models/trip';
import { ConnectivityService } from '../../services/connectivity';

import { CachedTileLayer } from './cached-tile-layer';

/** Zoom limits: street level at most (the tile server has no closer tiles), the city region at least. */
export const MIN_ZOOM = 11;
export const MAX_ZOOM = 19;

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
  imports: [IonIcon],
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
  /** Space (px) kept free above and below a fitted route, e.g. for a search bar and a bottom panel. */
  readonly fitPadding = input<{ top: number; bottom: number }>({ top: 40, bottom: 40 });
  /** Where the OpenStreetMap credit goes; move it when a panel covers the bottom of the map. */
  readonly attributionPosition = input<L.ControlPosition>('bottomright');
  /** False when the page shows the OpenStreetMap credit itself (e.g. in a bottom panel that covers the map). */
  readonly showAttribution = input(true);
  readonly mapClick = output<LatLng>();

  private readonly container = viewChild.required<ElementRef<HTMLDivElement>>('map');
  private readonly ready = signal(false);
  private readonly connectivity = inject(ConnectivityService);
  /** True when tiles of the current view could not be loaded (and are not in the tile cache). */
  private readonly tilesFailed = signal(false);

  /** Note shown over the map when it has no tiles to draw, so a grey map is never a mystery. */
  readonly tileNotice = computed(() => {
    if (!this.tilesFailed()) return null;
    return this.connectivity.online()
      ? { title: 'Map could not load', body: 'Check your connection. GPS and the fare meter still work.' }
      : {
          title: 'Map needs internet',
          body: 'GPS and the fare meter still work offline. Places you viewed before stay on the map.',
        };
  });

  private map?: L.Map;
  private line?: L.Polyline;
  private planLine?: L.Polyline;
  private here?: L.Marker;
  private start?: L.Marker;
  private end?: L.Marker;
  private resizeObserver?: ResizeObserver;
  private tiles?: L.TileLayer;

  constructor() {
    addIcons({ cloudOfflineOutline });

    // Back online: reload the tiles that failed.
    effect(() => {
      if (this.connectivity.online() && this.ready() && this.tilesFailed()) this.tiles?.redraw();
    });
    // Leaflet needs a real DOM element with a size, so create the map after rendering.
    afterNextRender(() => this.createMap());

    effect(() => {
      if (!this.ready() || !this.map) return;
      const route = this.route();
      this.line!.setLatLngs(route.map((p) => [p.lat, p.lng]));
      if (this.fitRoute() && route.length > 1) {
        const pad = this.fitPadding();
        this.map.fitBounds(this.line!.getBounds(), {
          paddingTopLeft: [40, pad.top],
          paddingBottomRight: [40, pad.bottom],
          maxZoom: 17,
        });
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
    this.map = L.map(el, {
      zoomControl: false,
      attributionControl: false,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      // Zooming past the limit bounces back instead of showing an empty grey map.
      bounceAtZoomLimits: true,
    }).setView(
      [CABANATUAN.lat, CABANATUAN.lng],
      14,
    );
    if (this.showAttribution()) {
      L.control.attribution({ position: this.attributionPosition(), prefix: false }).addTo(this.map);
    }
    this.tiles = new CachedTileLayer(environment.tileUrl, {
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      // Keep more tiles around the view, so small pans and zooms reuse what is already loaded.
      keepBuffer: 4,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);
    this.watchTiles(this.tiles);

    this.planLine = L.polyline([], { color: '#224194', weight: 5, opacity: 0.55, dashArray: '8 10' }).addTo(this.map);
    this.line = L.polyline([], { color: '#224194', weight: 6, opacity: 0.9, lineCap: 'round' }).addTo(this.map);
    this.map.on('click', (e: L.LeafletMouseEvent) => this.mapClick.emit({ lat: e.latlng.lat, lng: e.latlng.lng }));

    // Ionic animates pages in, so the size can change after creation: tell Leaflet to re-measure.
    this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize());
    this.resizeObserver.observe(el);
    this.ready.set(true);
  }

  /** Counts failed tiles per loading round (a pan or zoom) to show or hide the tile notice. */
  private watchTiles(layer: L.TileLayer): void {
    let failed = 0;
    layer.on('loading', () => (failed = 0));
    layer.on('tileerror', () => {
      failed++;
      this.tilesFailed.set(true);
    });
    layer.on('load', () => this.tilesFailed.set(failed > 0));
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
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });
    return L.marker([pos.lat, pos.lng], { icon, keyboard: false }).addTo(this.map!);
  }
}
