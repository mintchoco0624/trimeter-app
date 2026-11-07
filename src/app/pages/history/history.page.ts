import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonList,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  type RefresherCustomEvent,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  calendar,
  filter,
  map,
  navigate,
  receiptOutline,
  searchOutline,
  speedometer,
  swapVertical,
  time,
  trash,
} from 'ionicons/icons';

import { PASSENGER_LABELS } from '../../models/fare-matrix';
import { STATUS_LABELS, type Trip, tripStatus } from '../../models/trip';
import { DurationPipe } from '../../pipes/duration-pipe';
import { PesoPipe } from '../../pipes/peso-pipe';
import { FeedbackService } from '../../services/feedback';
import { SettingsService } from '../../services/settings';
import {
  DEFAULT_QUERY,
  type DateRange,
  RANGE_LABELS,
  SORT_LABELS,
  type TripQuery,
  type TripSort,
  isFiltered,
  queryTrips,
} from '../../services/trip-query';
import { TripStorageService } from '../../services/trip-storage';

/** Trip history read from local storage: search, filter and sort; tap for the receipt; swipe left to delete. */
@Component({
  selector: 'app-history',
  templateUrl: './history.page.html',
  styleUrls: ['./history.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonIcon,
    IonList,
    IonItem,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    IonRefresher,
    IonRefresherContent,
    IonSearchbar,
    IonSelect,
    IonSelectOption,
    RouterLink,
    PesoPipe,
    DurationPipe,
    DatePipe,
    DecimalPipe,
  ],
})
export class HistoryPage {
  private storage = inject(TripStorageService);
  private feedback = inject(FeedbackService);
  private settings = inject(SettingsService);

  readonly trips = this.storage.trips;
  readonly query = signal<TripQuery>({ ...DEFAULT_QUERY });
  readonly shown = computed(() => queryTrips(this.trips(), this.query()));
  readonly filtered = computed(() => isFiltered(this.query()));
  readonly totalKm = computed(() => this.shown().reduce((sum, t) => sum + t.distanceKm, 0));
  readonly totalFare = computed(() => this.shown().reduce((sum, t) => sum + t.fare.total, 0));

  readonly isDriver = computed(() => this.settings.role() === 'driver');
  readonly title = computed(() => (this.isDriver() ? 'Trip records' : 'History'));

  readonly passengerLabels = PASSENGER_LABELS;
  readonly statusLabels = STATUS_LABELS;
  readonly status = tripStatus;
  readonly ranges = Object.entries(RANGE_LABELS) as [DateRange, string][];
  readonly sorts = Object.entries(SORT_LABELS) as [TripSort, string][];

  constructor() {
    addIcons({
      calendar,
      trash,
      speedometer,
      map,
      navigate,
      receiptOutline,
      searchOutline,
      filter,
      swapVertical,
      time,
    });
  }

  setText(value: string | null | undefined): void {
    this.query.update((q) => ({ ...q, text: value ?? '' }));
  }

  setRange(value: DateRange): void {
    this.query.update((q) => ({ ...q, range: value }));
  }

  setSort(value: TripSort): void {
    this.query.update((q) => ({ ...q, sort: value }));
  }

  clearFilters(): void {
    this.query.set({ ...DEFAULT_QUERY, sort: this.query().sort });
  }

  async refresh(event: RefresherCustomEvent): Promise<void> {
    await this.storage.load();
    await event.target.complete();
  }

  async remove(trip: Trip, sliding: IonItemSliding): Promise<void> {
    await sliding.close();
    const ok = await this.feedback.confirm(
      'Delete this trip?',
      `${trip.from.label} → ${trip.to.label}`,
      'Delete',
      true,
    );
    if (!ok) return;
    await this.storage.remove(trip.id);
    await this.feedback.toast('Trip deleted.');
  }

  async clearAll(): Promise<void> {
    const ok = await this.feedback.confirm(
      'Clear all history?',
      'This deletes every saved trip on this phone.',
      'Clear all',
      true,
    );
    if (!ok) return;
    await this.storage.clear();
    await this.feedback.toast('History cleared.');
  }
}
