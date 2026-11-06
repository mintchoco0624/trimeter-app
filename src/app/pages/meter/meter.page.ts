import { DecimalPipe } from '@angular/common';
import { Component, type OnDestroy, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonLabel,
  IonSpinner,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { locate, map, navigate, person, play, stop, warning } from 'ionicons/icons';

import { TripMapComponent } from '../../components/trip-map/trip-map.component';
import { PASSENGER_LABELS } from '../../models/fare-matrix';
import type { LatLng, Place, Trip } from '../../models/trip';
import { DurationPipe } from '../../pipes/duration-pipe';
import { PesoPipe, formatPeso } from '../../pipes/peso-pipe';
import { FareService } from '../../services/fare';
import { FareMatrixService } from '../../services/fare-matrix';
import { FeedbackService } from '../../services/feedback';
import { GeocodeService } from '../../services/geocode';
import { LocationService } from '../../services/location';
import { SettingsService } from '../../services/settings';
import { TripStorageService } from '../../services/trip-storage';

/**
 * Automatic mode: the live GPS fare meter.
 * Start Trip -> GPS points extend the route -> distance and fare update live -> End Trip saves a receipt.
 */
@Component({
  selector: 'app-meter',
  templateUrl: './meter.page.html',
  styleUrls: ['./meter.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonContent,
    IonIcon,
    IonChip,
    IonLabel,
    IonFab,
    IonFabButton,
    IonSpinner,
    RouterLink,
    TripMapComponent,
    PesoPipe,
    DurationPipe,
    DecimalPipe,
  ],
})
export class MeterPage implements OnDestroy {
  private location = inject(LocationService);
  private fare = inject(FareService);
  private matrixService = inject(FareMatrixService);
  private settings = inject(SettingsService);
  private storage = inject(TripStorageService);
  private geocode = inject(GeocodeService);
  private feedback = inject(FeedbackService);
  private router = inject(Router);

  private readonly map = viewChild(TripMapComponent);

  readonly tracking = this.location.tracking;
  readonly distanceKm = this.location.distanceKm;
  readonly weakSignal = this.location.weakSignal;
  readonly gpsError = this.location.error;
  readonly matrix = this.matrixService.matrix;
  readonly busy = signal(false);
  readonly elapsedSec = signal(0);
  /** Position shown before a trip starts (from "Locate me"). */
  readonly preview = signal<LatLng | null>(null);
  private readonly startPlace = signal<Place | null>(null);

  readonly route = computed<LatLng[]>(() => this.location.points().map(({ lat, lng }) => ({ lat, lng })));
  readonly current = computed<LatLng | null>(() => {
    const fix = this.location.lastFix();
    return fix ? { lat: fix.lat, lng: fix.lng } : this.preview();
  });
  readonly accuracy = computed(() => this.location.lastFix()?.acc ?? null);
  readonly passengerLabel = computed(() => PASSENGER_LABELS[this.settings.passengerType()]);

  /** The live fare: recomputed every time the distance changes. */
  readonly breakdown = computed(() => {
    const matrix = this.matrix();
    if (!matrix) return null;
    return this.fare.compute(this.distanceKm(), this.settings.passengerType(), matrix, this.settings.fuelBandId());
  });

  private startedAt = 0;
  private timer?: ReturnType<typeof setInterval>;
  private lastTotal = 0;
  private startLookupDone = false;

  constructor() {
    addIcons({ play, stop, locate, map, navigate, person, warning });

    // Haptic tick whenever the fare goes up during a trip.
    effect(() => {
      const total = this.breakdown()?.total ?? 0;
      if (untracked(this.tracking) && total > this.lastTotal && this.lastTotal > 0) void this.feedback.tick();
      this.lastTotal = total;
    });

    // Look up the start place name once, as soon as the first good GPS point arrives.
    effect(() => {
      const first = this.location.points()[0];
      if (!first || this.startLookupDone) return;
      this.startLookupDone = true;
      void this.geocode.reverse(first).then((place) => this.startPlace.set(place));
    });
  }

  /** Ionic lifecycle: each time the Meter tab opens, show where the user is (if already allowed). */
  async ionViewDidEnter(): Promise<void> {
    if (this.tracking() || this.preview() || !(await this.location.isGranted())) return;
    try {
      const here = await this.location.getCurrent();
      this.preview.set(here);
      this.map()?.centerOn(here, 15);
    } catch {
      // no fix yet: the user can tap "Locate me"
    }
  }

  async locateMe(): Promise<void> {
    try {
      await this.location.ensurePermission();
      const here = await this.location.getCurrent();
      this.preview.set(here);
      this.map()?.centerOn(here);
    } catch (e) {
      await this.feedback.error(this.message(e, 'Could not get your location. Make sure GPS is on and try again.'));
    }
  }

  async startTrip(): Promise<void> {
    if (!this.matrix()) {
      await this.feedback.error('The fare matrix has not loaded yet. Check your connection and try again.');
      return;
    }
    this.busy.set(true);
    try {
      this.startLookupDone = false;
      this.startPlace.set(null);
      this.lastTotal = 0;
      await this.location.start();
      this.startedAt = Date.now();
      this.elapsedSec.set(0);
      this.timer = setInterval(() => this.elapsedSec.set(Math.round((Date.now() - this.startedAt) / 1000)), 1000);
      void this.feedback.bump();
      void this.feedback.toast('Trip started. Keep the app open while riding.', 'success');
    } catch (e) {
      await this.location.stop();
      await this.feedback.error(this.message(e, 'Could not start GPS tracking.'));
    } finally {
      this.busy.set(false);
    }
  }

  async endTrip(): Promise<void> {
    const fare = this.breakdown();
    const ok = await this.feedback.confirm(
      'End this trip?',
      `Distance ${this.distanceKm().toFixed(2)} km, fare ${formatPeso(fare?.total)}.`,
      'End trip',
    );
    if (!ok || !fare) return;

    this.busy.set(true);
    await this.location.stop();
    clearInterval(this.timer);

    const points = this.location.points();
    const first = points[0] ?? this.location.lastFix() ?? this.preview();
    const last = points.at(-1) ?? first;
    if (!first || !last) {
      this.busy.set(false);
      await this.feedback.error('No GPS position was recorded, so this trip cannot be saved. Try again outdoors.');
      return;
    }

    const from = this.startPlace() ?? (await this.geocode.reverse(first));
    const to = await this.geocode.reverse(last);
    const trip: Trip = {
      id: this.storage.newId(),
      mode: 'auto',
      startedAt: new Date(this.startedAt).toISOString(),
      endedAt: new Date().toISOString(),
      durationSec: this.elapsedSec(),
      distanceKm: fare.distanceKm,
      passengerType: fare.passengerType,
      fare,
      from,
      to,
      route: this.route(),
      distanceSource: 'GPS',
      matrixVersion: this.matrix()?.version ?? '',
    };

    await this.storage.add(trip);
    this.location.reset();
    this.elapsedSec.set(0);
    this.busy.set(false);
    void this.feedback.success();
    await this.router.navigate(['/trip', trip.id]);
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  private message(e: unknown, fallback: string): string {
    return e instanceof Error && e.message ? e.message : fallback;
  }
}
