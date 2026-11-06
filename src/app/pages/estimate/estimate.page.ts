import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSearchbar,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { locate, refresh, save, swapVertical } from 'ionicons/icons';

import { TripMapComponent } from '../../components/trip-map/trip-map.component';
import type { LatLng, Place, Trip } from '../../models/trip';
import { PesoPipe } from '../../pipes/peso-pipe';
import { FareService } from '../../services/fare';
import { FareMatrixService } from '../../services/fare-matrix';
import { FeedbackService } from '../../services/feedback';
import { GeocodeService } from '../../services/geocode';
import { LocationService } from '../../services/location';
import { type RouteResult, RoutingService } from '../../services/routing';
import { SettingsService } from '../../services/settings';
import { TripStorageService } from '../../services/trip-storage';

/**
 * Manual mode (backup when GPS is weak, or to check a fare before riding):
 * pick A and B on the map or by search, get the road distance, and see the expected fare.
 */
@Component({
  selector: 'app-estimate',
  templateUrl: './estimate.page.html',
  styleUrls: ['./estimate.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonContent,
    IonIcon,
    IonSearchbar,
    IonList,
    IonItem,
    IonLabel,
    IonSpinner,
    TripMapComponent,
    PesoPipe,
    DecimalPipe,
  ],
})
export class EstimatePage {
  private geocode = inject(GeocodeService);
  private routing = inject(RoutingService);
  private fare = inject(FareService);
  private matrixService = inject(FareMatrixService);
  private settings = inject(SettingsService);
  private location = inject(LocationService);
  private storage = inject(TripStorageService);
  private feedback = inject(FeedbackService);
  private router = inject(Router);

  private readonly map = viewChild(TripMapComponent);

  readonly from = signal<Place | null>(null);
  readonly to = signal<Place | null>(null);
  readonly result = signal<RouteResult | null>(null);
  readonly busy = signal(false);
  readonly searchResults = signal<Place[]>([]);
  readonly searching = signal(false);

  readonly path = computed<LatLng[]>(() => this.result()?.path ?? []);
  readonly breakdown = computed(() => {
    const r = this.result();
    const m = this.matrixService.matrix();
    if (!r || !m) return null;
    return this.fare.compute(r.distanceKm, this.settings.passengerType(), m, this.settings.fuelBandId());
  });
  readonly instruction = computed(() => {
    if (!this.from()) return 'Tap the map to set A (pick-up), or use your location.';
    if (!this.to()) return 'Now tap the map or search to set B (drop-off).';
    return '';
  });

  constructor() {
    addIcons({ locate, refresh, save, swapVertical });
  }

  /** Map tap: first tap sets A, second sets B, a third starts over with a new A. */
  async onMapClick(point: LatLng): Promise<void> {
    if (this.from() && this.to()) this.reset();
    const place = { ...point, label: 'Loading place name…' };
    if (!this.from()) {
      this.from.set(place);
      this.from.set(await this.geocode.reverse(point));
    } else {
      this.to.set(place);
      this.to.set(await this.geocode.reverse(point));
      await this.compute();
    }
  }

  async useMyLocation(): Promise<void> {
    try {
      await this.location.ensurePermission();
      const here = await this.location.getCurrent();
      this.from.set(await this.geocode.reverse(here));
      this.map()?.centerOn(here, 15);
      if (this.to()) await this.compute();
    } catch {
      await this.feedback.error('Could not get your location. Tap the map to set the pick-up point instead.');
    }
  }

  async search(term: string | null | undefined): Promise<void> {
    const q = (term ?? '').trim();
    if (q.length < 3) {
      this.searchResults.set([]);
      return;
    }
    this.searching.set(true);
    try {
      this.searchResults.set(await this.geocode.search(q));
    } catch {
      this.searchResults.set([]);
      await this.feedback.toast('Search needs an internet connection. You can still tap the map.', 'warning');
    } finally {
      this.searching.set(false);
    }
  }

  async pickResult(place: Place): Promise<void> {
    this.searchResults.set([]);
    if (!this.from()) this.from.set(place);
    else this.to.set(place);
    this.map()?.centerOn(place, 15);
    if (this.from() && this.to()) await this.compute();
  }

  async swap(): Promise<void> {
    const a = this.from();
    this.from.set(this.to());
    this.to.set(a);
    if (this.from() && this.to()) await this.compute();
  }

  reset(): void {
    this.from.set(null);
    this.to.set(null);
    this.result.set(null);
  }

  async saveTrip(): Promise<void> {
    const from = this.from();
    const to = this.to();
    const r = this.result();
    const fare = this.breakdown();
    if (!from || !to || !r || !fare) return;
    const now = new Date().toISOString();
    const trip: Trip = {
      id: this.storage.newId(),
      mode: 'manual',
      startedAt: now,
      endedAt: now,
      durationSec: Math.round(r.durationMin * 60),
      distanceKm: fare.distanceKm,
      passengerType: fare.passengerType,
      fare,
      from,
      to,
      route: r.path,
      distanceSource: r.kind === 'road' ? 'Road route (OSRM)' : 'Straight line ×1.3',
      matrixVersion: this.matrixService.matrix()?.version ?? '',
    };
    await this.storage.add(trip);
    void this.feedback.success();
    await this.router.navigate(['/trip', trip.id], { replaceUrl: true });
  }

  private async compute(): Promise<void> {
    const a = this.from();
    const b = this.to();
    if (!a || !b) return;
    this.busy.set(true);
    const result = await this.routing.route(a, b);
    this.result.set(result);
    this.busy.set(false);
    if (result.kind === 'straight') {
      await this.feedback.toast('Offline: showing a straight-line estimate (×1.3).', 'warning');
    }
  }
}
