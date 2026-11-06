import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import {
  IonAccordion,
  IonAccordionGroup,
  IonBadge,
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { call, cloudDownload, helpCircle, informationCircle, openOutline } from 'ionicons/icons';

import { PASSENGER_LABELS, type PassengerType } from '../../models/fare-matrix';
import { PesoPipe } from '../../pipes/peso-pipe';
import { FareService } from '../../services/fare';
import { FareMatrixService } from '../../services/fare-matrix';
import { FeedbackService } from '../../services/feedback';
import { SettingsService } from '../../services/settings';

interface Faq {
  q: string;
  a: string;
}

/** The fare matrix in use, passenger type and gas price settings, plus help and FAQs. */
@Component({
  selector: 'app-fare-info',
  templateUrl: './fare-info.page.html',
  styleUrls: ['./fare-info.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonItem,
    IonBadge,
    IonButton,
    IonIcon,
    IonSpinner,
    IonAccordionGroup,
    IonAccordion,
    PesoPipe,
    DatePipe,
  ],
})
export class FareInfoPage {
  private fareService = inject(FareService);
  private matrixService = inject(FareMatrixService);
  private settings = inject(SettingsService);
  private feedback = inject(FeedbackService);

  readonly matrix = this.matrixService.matrix;
  readonly source = this.matrixService.source;
  readonly loading = this.matrixService.loading;
  readonly passengerType = this.settings.passengerType;
  readonly labels = PASSENGER_LABELS;
  readonly types: PassengerType[] = ['regular', 'student', 'senior', 'pwd'];

  readonly band = computed(() => {
    const m = this.matrix();
    return m ? this.fareService.findBand(m, this.settings.fuelBandId()) : null;
  });

  /** Example fares so users can sanity-check a ride before taking it. */
  readonly examples = computed(() => {
    const m = this.matrix();
    if (!m) return [];
    const band = this.settings.fuelBandId();
    return [1, 3, 4, 5, 7, 10].map((km) => ({
      km,
      regular: this.fareService.compute(km, 'regular', m, band).total,
      discounted: this.fareService.compute(km, 'student', m, band).total,
    }));
  });

  readonly faqs: Faq[] = [
    {
      q: 'How is the fare computed?',
      a: 'The base fare covers the first 3 km. Every succeeding kilometre adds the per-km rate, and a part of a kilometre counts as a full kilometre. Students, seniors and PWDs pay the discounted column.',
    },
    {
      q: 'Why can the GPS distance differ a little from the driver’s estimate?',
      a: 'GPS on phones is accurate to about 5–30 m. TriMeter ignores fixes that are too inaccurate, tiny jitters while stopped, and impossible jumps, so the distance follows the road you actually rode.',
    },
    {
      q: 'Do I need mobile data?',
      a: 'GPS works without data. Data is used for the map tiles, place names and checking for a newer fare matrix. Without data, the meter still counts distance and fare using the saved matrix.',
    },
    {
      q: 'What if the driver asks for more?',
      a: 'Open the trip receipt, type what the driver asked, and TriMeter shows how much you were overcharged. You can share the receipt and call the city hotline.',
    },
    {
      q: 'Where is my data stored?',
      a: 'Only on your phone. TriMeter has no account and does not upload your trips.',
    },
  ];

  constructor() {
    addIcons({ cloudDownload, helpCircle, informationCircle, call, openOutline });
  }

  async setType(value: string | number | undefined): Promise<void> {
    if (!value) return;
    await this.settings.setPassengerType(value as PassengerType);
    await this.feedback.toast(`Passenger type: ${this.labels[value as PassengerType]}`);
  }

  async setBand(value: string): Promise<void> {
    await this.settings.setFuelBand(value);
    await this.feedback.toast('Gas price band updated. New fares apply from your next trip.');
  }

  checkUpdates(): void {
    this.matrixService.refresh();
    void this.feedback.toast('Checking for the latest fare matrix…');
  }
}
