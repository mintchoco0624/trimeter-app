import { Component, inject, input, output, signal } from '@angular/core';
import { IonIcon, IonItem, IonLabel, IonList, IonSearchbar, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cloudOffline, locationOutline, searchOutline } from 'ionicons/icons';

import type { Place } from '../../models/trip';
import { ConnectivityService } from '../../services/connectivity';
import { GeocodeService } from '../../services/geocode';

/** Shortest query we send, so we do not call Nominatim on every letter. */
export const MIN_QUERY_LENGTH = 3;

/**
 * Search box for places in Cabanatuan (OpenStreetMap Nominatim, HttpClient GET).
 * Shows results, "no results", "offline" and error states, and emits the place the user picks.
 */
@Component({
  selector: 'app-place-search',
  templateUrl: './place-search.component.html',
  styleUrls: ['./place-search.component.scss'],
  imports: [IonSearchbar, IonList, IonItem, IonLabel, IonIcon, IonSpinner],
})
export class PlaceSearchComponent {
  private geocode = inject(GeocodeService);
  readonly online = inject(ConnectivityService).online;

  readonly placeholder = input('Where to?');
  readonly picked = output<Place>();

  readonly query = signal('');
  readonly results = signal<Place[]>([]);
  readonly searching = signal(false);
  readonly message = signal('');

  /** Latest request number: older answers that arrive late are ignored. */
  private requestId = 0;

  constructor() {
    addIcons({ searchOutline, locationOutline, cloudOffline });
  }

  async search(term: string | null | undefined): Promise<void> {
    const q = (term ?? '').trim();
    this.query.set(q);
    this.message.set('');
    if (q.length < MIN_QUERY_LENGTH) {
      this.results.set([]);
      return;
    }
    if (!this.online()) {
      this.results.set([]);
      this.message.set('You are offline. Place search needs internet; you can tap the map instead.');
      return;
    }

    const id = ++this.requestId;
    this.searching.set(true);
    try {
      const found = await this.geocode.search(q);
      if (id !== this.requestId) return;
      this.results.set(found);
      if (found.length === 0) this.message.set(`No places named “${q}” found in Cabanatuan.`);
    } catch {
      if (id !== this.requestId) return;
      this.results.set([]);
      this.message.set('Search is not available right now. Check your connection, or tap the map instead.');
    } finally {
      if (id === this.requestId) this.searching.set(false);
    }
  }

  pick(place: Place): void {
    this.query.set('');
    this.results.set([]);
    this.message.set('');
    this.picked.emit(place);
  }

  clear(): void {
    this.requestId++;
    this.query.set('');
    this.results.set([]);
    this.message.set('');
    this.searching.set(false);
  }
}
