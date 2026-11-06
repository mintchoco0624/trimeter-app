import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
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
  IonTitle,
  IonToolbar,
  type RefresherCustomEvent,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { calendar, map, navigate, receiptOutline, speedometer, trash } from 'ionicons/icons';

import type { Trip } from '../../models/trip';
import { PesoPipe } from '../../pipes/peso-pipe';
import { FeedbackService } from '../../services/feedback';
import { TripStorageService } from '../../services/trip-storage';

/** Trip history read from local storage: tap for the receipt, swipe left to delete. */
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
    RouterLink,
    PesoPipe,
    DatePipe,
    DecimalPipe,
  ],
})
export class HistoryPage {
  private storage = inject(TripStorageService);
  private feedback = inject(FeedbackService);

  readonly trips = this.storage.trips;
  readonly totalKm = this.storage.totalKm;
  readonly totalFare = this.storage.totalFare;

  constructor() {
    addIcons({ calendar, trash, speedometer, map, navigate, receiptOutline });
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
