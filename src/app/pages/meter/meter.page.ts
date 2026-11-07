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
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { close, cloudOffline, flag, locate, map, navigate, person, play, stop, time, warning } from 'ionicons/icons';

import { PlaceSearchComponent } from '../../components/place-search/place-search.component';
import { TripMapComponent } from '../../components/trip-map/trip-map.component';
import { PASSENGER_LABELS, type PassengerType } from '../../models/fare-matrix';
import type { LatLng, Place, TrackPoint, Trip } from '../../models/trip';
import { DurationPipe } from '../../pipes/duration-pipe';
import { PesoPipe, formatPeso } from '../../pipes/peso-pipe';
import { ConnectivityService } from '../../services/connectivity';
import { FareService } from '../../services/fare';
import { FareMatrixService } from '../../services/fare-matrix';
import { FeedbackService } from '../../services/feedback';
import { GeocodeService } from '../../services/geocode';
import { LocationService, MIN_TRIP_KM, gpsQuality, haversineKm } from '../../services/location';
import { type RouteResult, RoutingService } from '../../services/routing';
import { SettingsService } from '../../services/settings';
import { TripStorageService } from '../../services/trip-storage';

/** ready -> starting -> onTrip -> ending -> ready. Buttons only work in the matching phase. */
export type MeterPhase = 'ready' | 'starting' | 'onTrip' | 'ending';

/** A destination closer than this (100 m) is where the user already is. */
const MIN_DESTINATION_KM = 0.1;

/**
 * The live GPS fare meter (automatic mode).
 * Commuter: pick a destination for a fare preview, then Start Trip.
 * Driver: pick the passenger type for this ride, then Start Trip.
 * GPS points extend the route -> distance and fare update live -> End Trip saves a receipt.
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
    IonSegment,
    IonSegmentButton,
    RouterLink,
    TripMapComponent,
    PlaceSearchComponent,
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
  private routing = inject(RoutingService);
  private feedback = inject(FeedbackService);
  private router = inject(Router);

  private readonly map = viewChild(TripMapComponent);

  readonly online = inject(ConnectivityService).online;
  readonly distanceKm = this.location.distanceKm;
  readonly gpsError = this.location.error;
  readonly matrix = this.matrixService.matrix;
  readonly labels = PASSENGER_LABELS;
  readonly passengerTypes: PassengerType[] = ['regular', 'student', 'senior', 'pwd'];

  readonly phase = signal<MeterPhase>('ready');
  readonly onTrip = computed(() => this.phase() === 'onTrip' || this.phase() === 'ending');
  readonly elapsedSec = signal(0);

  // ----- Role and passenger -----
  readonly isDriver = computed(() => this.settings.role() === 'driver');
  /** Drivers choose the passenger for each ride; it goes back to Regular after every trip. */
  readonly driverPassenger = signal<PassengerType>('regular');
  readonly passenger = computed<PassengerType>(() =>
    this.isDriver() ? this.driverPassenger() : this.settings.passengerType(),
  );

  // ----- GPS -----
  /** Position shown before a trip starts (from "Locate me" or when the tab opens). */
  readonly preview = signal<TrackPoint | null>(null);
  readonly route = computed<LatLng[]>(() => this.location.points().map(({ lat, lng }) => ({ lat, lng })));
  readonly current = computed<LatLng | null>(() => {
    const fix = this.location.lastFix() ?? this.preview();
    return fix ? { lat: fix.lat, lng: fix.lng } : null;
  });
  readonly accuracy = computed(() => (this.location.lastFix() ?? this.preview())?.acc ?? null);
  readonly quality = computed(() => gpsQuality(this.accuracy()));
  private readonly startPlace = signal<Place | null>(null);

  // ----- Commuter destination preview -----
  readonly destination = signal<Place | null>(null);
  readonly estimate = signal<RouteResult | null>(null);
  readonly estimating = signal(false);
  readonly planPath = computed<LatLng[]>(() => (this.onTrip() ? [] : (this.estimate()?.path ?? [])));
  readonly estimateFare = computed(() => {
    const r = this.estimate();
    const m = this.matrix();
    return r && m ? this.fare.compute(r.distanceKm, this.passenger(), m, this.settings.fuelBandId()) : null;
  });

  /** The live fare: recomputed every time the distance changes. */
  readonly breakdown = computed(() => {
    const matrix = this.matrix();
    if (!matrix) return null;
    return this.fare.compute(this.distanceKm(), this.passenger(), matrix, this.settings.fuelBandId());
  });

  private startedAt = 0;
  private timer?: ReturnType<typeof setInterval>;
  private lastTotal = 0;
  private startLookupDone = false;

  constructor() {
    addIcons({ play, stop, locate, map, navigate, person, warning, close, flag, cloudOffline, time });

    // Haptic tick whenever the fare goes up during a trip.
    effect(() => {
      const total = this.breakdown()?.total ?? 0;
      if (untracked(this.onTrip) && total > this.lastTotal && this.lastTotal > 0) void this.feedback.tick();
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

  /** Ionic lifecycle: each time the Meter tab opens, show where the user is (only if already allowed). */
  async ionViewDidEnter(): Promise<void> {
    if (this.onTrip() || this.preview() || !(await this.location.isGranted())) return;
    try {
      const here = await this.location.getCurrent();
      this.preview.set(here);
      this.map()?.centerOn(here, 15);
    } catch {
      // no fix yet: the user can tap "Locate me"
    }
  }

  async locateMe(): Promise<void> {
    if (!(await this.askForLocation())) return;
    try {
      const here = await this.location.getCurrent();
      this.preview.set(here);
      this.map()?.centerOn(here);
    } catch (e) {
      await this.feedback.error(this.message(e, 'Could not get your location. Make sure GPS is on and try again.'));
    }
  }

  // ----- Commuter: destination and fare preview -----

  async onDestination(place: Place): Promise<void> {
    let origin = this.current();
    if (!origin) {
      if (!(await this.askForLocation())) return;
      try {
        const here = await this.location.getCurrent();
        this.preview.set(here);
        origin = here;
      } catch {
        await this.offerManual(
          'Location needed',
          'TriMeter needs your current location to estimate the fare to this destination. ' +
            'You can set both points yourself in Manual mode.',
        );
        return;
      }
    }

    if (haversineKm(origin, place) < MIN_DESTINATION_KM) {
      await this.feedback.toast('That place is where you are now. Choose a different destination.', 'warning');
      return;
    }

    this.destination.set(place);
    this.estimate.set(null);
    this.estimating.set(true);
    const result = await this.routing.route(origin, place);
    // The user may have cleared the destination while the route was loading.
    if (this.destination() !== place) return;
    this.estimate.set(result);
    this.estimating.set(false);
    if (result.kind === 'straight') {
      await this.feedback.toast(
        'No road route available (offline?). Showing a straight-line estimate ×1.3.',
        'warning',
      );
    }
  }

  clearDestination(): void {
    this.destination.set(null);
    this.estimate.set(null);
    this.estimating.set(false);
  }

  // ----- Trip -----

  async startTrip(): Promise<void> {
    if (this.phase() !== 'ready') {
      if (this.onTrip()) await this.feedback.toast('A trip is already in progress.', 'warning');
      return;
    }
    if (!this.matrix()) {
      await this.feedback.error('The fare matrix has not loaded yet. Check your connection and try again.');
      return;
    }
    this.phase.set('starting');
    if (!(await this.askForLocation())) {
      this.phase.set('ready');
      return;
    }
    try {
      this.startLookupDone = false;
      this.startPlace.set(null);
      this.lastTotal = 0;
      await this.location.start();
      this.startedAt = Date.now();
      this.elapsedSec.set(0);
      this.timer = setInterval(() => this.elapsedSec.set(Math.round((Date.now() - this.startedAt) / 1000)), 1000);
      this.phase.set('onTrip');
      void this.feedback.bump();
      void this.feedback.toast('Trip started. Keep the app open while riding.', 'success');
    } catch (e) {
      await this.location.stop();
      this.phase.set('ready');
      await this.offerManual('GPS unavailable', this.message(e, 'Could not start GPS tracking.'));
    }
  }

  async endTrip(): Promise<void> {
    if (this.phase() !== 'onTrip') {
      if (this.phase() === 'ready') await this.feedback.toast('No trip is in progress.', 'warning');
      return;
    }
    // Block a second tap while the dialog is open.
    this.phase.set('ending');

    if (this.distanceKm() < MIN_TRIP_KM) {
      const discard = await this.feedback.confirm(
        'No distance recorded',
        'GPS measured less than 50 m, so there is no fare to save. ' +
          'Discard this trip, or keep tracking if the ride is still going. ' +
          'If GPS is not working, you can use Manual mode instead.',
        'Discard trip',
        true,
      );
      if (discard) await this.discardTrip();
      else this.phase.set('onTrip');
      return;
    }

    const fare = this.breakdown();
    const ok = await this.feedback.confirm(
      'End this trip?',
      `Distance ${this.distanceKm().toFixed(2)} km, fare ${formatPeso(fare?.total)}.`,
      'End trip',
    );
    if (!ok || !fare) {
      this.phase.set('onTrip');
      return;
    }

    await this.location.stop();
    clearInterval(this.timer);

    const points = this.location.points();
    const first = points[0];
    const last = points.at(-1) ?? first;
    const from = this.startPlace() ?? (await this.geocode.reverse(first));
    const to = await this.geocode.reverse(last);
    const estimate = this.estimate();
    const trip: Trip = {
      id: this.storage.newId(),
      mode: 'auto',
      status: 'completed',
      role: this.settings.role(),
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
      destination: this.destination() ?? undefined,
      estimate:
        estimate && this.estimateFare()
          ? {
              distanceKm: estimate.distanceKm,
              durationMin: estimate.durationMin,
              fare: this.estimateFare()!.total,
              kind: estimate.kind,
            }
          : undefined,
    };

    if (!(await this.saveWithRetry(trip))) {
      // Not saved: keep the route on screen so nothing is lost silently, and let the user try again.
      this.phase.set('ready');
      return;
    }

    this.resetTrip();
    void this.feedback.success();
    await this.router.navigate(['/trip', trip.id]);
  }

  setDriverPassenger(value: string | number | undefined): void {
    if (value && !this.onTrip()) this.driverPassenger.set(value as PassengerType);
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  // ----- Helpers -----

  private async discardTrip(): Promise<void> {
    await this.location.stop();
    this.resetTrip();
    await this.feedback.toast('Trip discarded. Nothing was saved.');
  }

  private resetTrip(): void {
    clearInterval(this.timer);
    this.location.reset();
    this.elapsedSec.set(0);
    this.driverPassenger.set('regular');
    this.clearDestination();
    this.phase.set('ready');
  }

  /** Saves the trip; on failure asks to try again. Resolves to true when saved. */
  private async saveWithRetry(trip: Trip): Promise<boolean> {
    for (;;) {
      try {
        await this.storage.add(trip);
        return true;
      } catch {
        const retry = await this.feedback.confirm(
          'Could not save the trip',
          'The trip could not be saved on this phone (storage may be full). Try again?',
          'Try again',
        );
        if (!retry) return false;
      }
    }
  }

  /** Shows the "why we need GPS" note before the first Android permission prompt. */
  private async askForLocation(): Promise<boolean> {
    if (await this.location.isGranted()) return true;
    if (!(await this.feedback.explainLocation())) return false;
    try {
      await this.location.ensurePermission();
      return true;
    } catch (e) {
      await this.offerManual('Location not allowed', this.message(e, 'Location permission was not given.'));
      return false;
    }
  }

  /** Explains a GPS problem and offers Manual mode, which works without GPS. */
  private async offerManual(header: string, message: string): Promise<void> {
    const go = await this.feedback.confirm(
      header,
      `${message} You can still estimate the fare with Manual mode.`,
      'Use Manual mode',
    );
    if (go) await this.router.navigateByUrl('/estimate');
  }

  private message(e: unknown, fallback: string): string {
    return e instanceof Error && e.message ? e.message : fallback;
  }
}
