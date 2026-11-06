import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Share } from '@capacitor/share';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircle, checkmarkCircle, shareSocial, trash } from 'ionicons/icons';

import { TripMapComponent } from '../../components/trip-map/trip-map.component';
import { PASSENGER_LABELS } from '../../models/fare-matrix';
import type { Trip } from '../../models/trip';
import { DurationPipe, formatDuration } from '../../pipes/duration-pipe';
import { PesoPipe, formatPeso } from '../../pipes/peso-pipe';
import { FareService } from '../../services/fare';
import { FareMatrixService } from '../../services/fare-matrix';
import { FeedbackService } from '../../services/feedback';
import { TripStorageService } from '../../services/trip-storage';

/** The receipt after a trip: route, fare breakdown, an overcharge check and sharing. */
@Component({
  selector: 'app-trip-summary',
  templateUrl: './trip-summary.page.html',
  styleUrls: ['./trip-summary.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonContent,
    IonIcon,
    IonInput,
    FormsModule,
    RouterLink,
    TripMapComponent,
    PesoPipe,
    DurationPipe,
    DatePipe,
    DecimalPipe,
  ],
})
export class TripSummaryPage {
  private storage = inject(TripStorageService);
  private fareService = inject(FareService);
  private feedback = inject(FeedbackService);
  private router = inject(Router);
  private matrixService = inject(FareMatrixService);
  readonly hotline = computed(() => this.matrixService.matrix()?.hotline ?? '');

  /** From the route /trip/:id (withComponentInputBinding). */
  readonly id = input.required<string>();
  readonly trip = signal<Trip | null>(null);
  readonly notFound = signal(false);
  readonly labels = PASSENGER_LABELS;

  /** What the driver asked, typed by the passenger. */
  asked: number | null = null;
  readonly askedSignal = signal<number | null>(null);

  readonly check = computed(() => {
    const trip = this.trip();
    const asked = this.askedSignal();
    if (!trip || asked === null || asked <= 0) return null;
    return { ...this.fareService.overcharge(trip.fare.total, asked), asked };
  });

  constructor() {
    addIcons({ shareSocial, trash, checkmarkCircle, alertCircle });
    effect(() => void this.load(this.id()));
  }

  private async load(id: string): Promise<void> {
    const trip = await this.storage.get(id);
    this.trip.set(trip ?? null);
    this.notFound.set(!trip);
    this.asked = trip?.driverAsked ?? null;
    this.askedSignal.set(this.asked);
  }

  onAskedChange(value: string | number | null | undefined): void {
    const n = value === '' || value === null || value === undefined ? null : Number(value);
    this.askedSignal.set(n !== null && Number.isFinite(n) ? n : null);
  }

  async saveAsked(): Promise<void> {
    const trip = this.trip();
    if (!trip) return;
    const updated = { ...trip, driverAsked: this.askedSignal() ?? undefined };
    await this.storage.update(updated);
    this.trip.set(updated);
    await this.feedback.toast('Saved to this trip.', 'success');
  }

  async share(): Promise<void> {
    const t = this.trip();
    if (!t) return;
    const text = [
      'TriMeter fare receipt',
      `${new Date(t.startedAt).toLocaleString()}`,
      `From: ${t.from.label}`,
      `To: ${t.to.label}`,
      `Distance: ${t.distanceKm.toFixed(2)} km (${t.distanceSource})`,
      `Time: ${formatDuration(t.durationSec)}`,
      `Passenger: ${this.labels[t.passengerType]}`,
      `Fair fare: ${formatPeso(t.fare.total)}`,
      t.driverAsked ? `Driver asked: ${formatPeso(t.driverAsked)}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await Share.share({ title: 'TriMeter fare receipt', text, dialogTitle: 'Share receipt' });
    } catch {
      // Sharing is not available (e.g. desktop browser): copy instead.
      try {
        await navigator.clipboard.writeText(text);
        await this.feedback.toast('Receipt copied to clipboard.');
      } catch {
        await this.feedback.error('Sharing is not available on this device.');
      }
    }
  }

  async remove(): Promise<void> {
    const t = this.trip();
    if (!t) return;
    const ok = await this.feedback.confirm(
      'Delete this trip?',
      'It will be removed from your history.',
      'Delete',
      true,
    );
    if (!ok) return;
    await this.storage.remove(t.id);
    await this.feedback.toast('Trip deleted.');
    await this.router.navigateByUrl('/tabs/history', { replaceUrl: true });
  }
}
