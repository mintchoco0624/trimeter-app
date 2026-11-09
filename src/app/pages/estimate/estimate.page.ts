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
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { locate, refresh, save, swapVertical } from 'ionicons/icons';

import { PlaceSearchComponent } from '../../components/place-search/place-search.component';
import { TripMapComponent } from '../../components/trip-map/trip-map.component';
import { PASSENGER_LABELS } from '../../models/fare-matrix';
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
    IonSpinner,
    TripMapComponent,
    PlaceSearchComponent,
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
  /** True while the pick-up is being set to the user's current position. */
  readonly locating = signal(false);
  /** True when the pick-up (A) is the user's own GPS position. */
  readonly fromIsMine = signal(false);
  readonly passengerLabel = computed(() => PASSENGER_LABELS[this.settings.passengerType()]);

  readonly path = computed<LatLng[]>(() => this.result()?.path ?? []);
  readonly breakdown = computed(() => {
    const r = this.result();
    const m = this.matrixService.matrix();
    if (!r || !m) return null;
    return this.fare.compute(r.distanceKm, this.settings.passengerType(), m, this.settings.fuelBandId());
  });
  readonly instruction = computed(() => {
    if (this.locating()) return 'Finding your location for the pick-up (A)…';
    if (!this.from()) return 'Search or tap the map to set the pick-up (A), or tap “My location”.';
    if (!this.to()) return 'Search or tap the map to set the drop-off (B).';
    return '';
  });

  constructor() {
    addIcons({ locate, refresh, save, swapVertical });
  }

  /** Ionic lifecycle: start from where the user is, so only the drop-off is left to choose. */
  async ionViewDidEnter(): Promise<void> {
    if (this.from() || !(await this.location.isGranted())) return;
    await this.setPickupToMe(false);
  }

  /** Map tap: sets A if it is empty, otherwise places (or moves) the drop-off B. */
  async onMapClick(point: LatLng): Promise<void> {
    const place = { ...point, label: 'Loading place name…' };
    if (!this.from()) {
      this.fromIsMine.set(false);
      this.from.set(place);
      this.from.set(await this.geocode.reverse(point));
    } else {
      this.to.set(place);
      this.to.set(await this.geocode.reverse(point));
      await this.compute();
    }
  }

  async useMyLocation(): Promise<void> {
    if (!(await this.location.isGranted()) && !(await this.feedback.explainLocation())) return;
    await this.setPickupToMe(true);
  }

  /** Sets the pick-up (A) to the current GPS position. Errors are shown only when the user asked. */
  private async setPickupToMe(userAsked: boolean): Promise<void> {
    this.locating.set(true);
    try {
      await this.location.ensurePermission();
      const here = await this.location.getCurrent();
      this.from.set({ ...here, label: 'Your location' });
      this.fromIsMine.set(true);
      this.map()?.centerOn(here, 15);
      this.from.set(await this.geocode.reverse(here));
      if (this.to()) await this.compute();
    } catch {
      if (userAsked) {
        await this.feedback.error('Could not get your location. Tap the map to set the pick-up point instead.');
      }
    } finally {
      this.locating.set(false);
    }
  }

  async pickResult(place: Place): Promise<void> {
    if (!this.from()) {
      this.fromIsMine.set(false);
      this.from.set(place);
    } else this.to.set(place);
    this.map()?.centerOn(place, 15);
    if (this.from() && this.to()) await this.compute();
  }

  async swap(): Promise<void> {
    const a = this.from();
    this.fromIsMine.set(false);
    this.from.set(this.to());
    this.to.set(a);
    if (this.from() && this.to()) await this.compute();
  }

  /** Start over: clear both points, then use the current location as the pick-up again (if allowed). */
  reset(): void {
    this.from.set(null);
    this.to.set(null);
    this.result.set(null);
    this.fromIsMine.set(false);
    void this.location.isGranted().then((granted) => {
      if (granted && !this.from()) void this.setPickupToMe(false);
    });
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
      status: 'estimate',
      role: this.settings.role(),
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
