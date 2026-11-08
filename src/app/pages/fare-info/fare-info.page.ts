import { DatePipe } from '@angular/common';
import { Component, computed, inject, viewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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
import {
  call,
  chatbubble,
  cloudDownload,
  cloudOffline,
  helpCircle,
  informationCircle,
  openOutline,
} from 'ionicons/icons';

import { FareCalculatorComponent } from '../../components/fare-calculator/fare-calculator.component';
import { PASSENGER_LABELS, type PassengerType } from '../../models/fare-matrix';
import { PesoPipe } from '../../pipes/peso-pipe';
import { ConnectivityService } from '../../services/connectivity';
import { FareService } from '../../services/fare';
import { FareMatrixService } from '../../services/fare-matrix';
import { FeedbackService } from '../../services/feedback';
import { SettingsService } from '../../services/settings';

interface Faq {
  q: string;
  a: string;
}

/** Answers to the questions commuters and drivers ask most. Kept factual: no invented rules or contacts. */
export const FAQS: Faq[] = [
  {
    q: 'How is the fare computed?',
    a: 'The base fare covers the first 3 km. Every succeeding kilometre adds the per-km rate, and a part of a kilometre counts as a full kilometre (3.2 km is charged as 4 km). Fares are per passenger, and the rates come from the city fare guideline shown above.',
  },
  {
    q: 'How does GPS measure the distance?',
    a: 'During a trip the phone reports its position about every 2 seconds. TriMeter adds up the distance between positions, but ignores positions that are too inaccurate (over 35 m), tiny movements while standing still (under 5 m) and impossible jumps (faster than 108 km/h).',
  },
  {
    q: 'Why can the GPS distance differ from the driver’s estimate?',
    a: 'Drivers often estimate by feel or by a usual route. GPS measures the road actually travelled, and phone GPS can drift a few metres near tall buildings or in bad weather. Small differences are normal; large ones are worth checking on the receipt map.',
  },
  {
    q: 'What happens when GPS becomes unavailable?',
    a: 'The Meter shows “GPS signal lost” and pauses the distance until the signal returns, so you are never charged for a jump. If GPS does not work at all, use Manual estimate: pick the start and end on the map to get the road distance and fare.',
  },
  {
    q: 'Do I need mobile data?',
    a: 'No for the meter: GPS distance and the fare work offline with the saved fare matrix. Mobile data is needed for the map pictures, place search and names, road distance in Manual mode, and checking for a newer fare matrix.',
  },
  {
    q: 'How are discounts applied?',
    a: 'Students, senior citizens and persons with disabilities (PWDs) pay the “discounted” column of the fare matrix. The passenger shows a valid ID to the driver. TriMeter does not check IDs; it only applies the rates in the matrix.',
  },
  {
    q: 'How can I report a fare discrepancy?',
    a: 'Open the trip receipt, type what the driver asked, and TriMeter shows the difference. Share or save the receipt, note the tricycle’s body number and TODA, and follow the steps under “Fare complaint assistance” below, which include the city’s complaint number.',
  },
  {
    q: 'How are my personal information and trips stored?',
    a: 'Only on your phone, using the app’s local storage. There is no account or password and nothing is uploaded, except the start and end points sent to OpenStreetMap services to show place names, the map and road distance.',
  },
];

/** Fare matrix, calculator, examples, source and verification status, help, complaints and about. */
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
    FareCalculatorComponent,
    PesoPipe,
    DatePipe,
  ],
})
export class FareInfoPage {
  private fareService = inject(FareService);
  private matrixService = inject(FareMatrixService);
  private settings = inject(SettingsService);
  private feedback = inject(FeedbackService);
  private route = inject(ActivatedRoute);
  private readonly content = viewChild(IonContent);

  readonly online = inject(ConnectivityService).online;
  readonly matrix = this.matrixService.matrix;
  readonly source = this.matrixService.source;
  readonly loading = this.matrixService.loading;
  readonly passengerType = this.settings.passengerType;
  readonly bandId = this.settings.fuelBandId;
  readonly isDriver = computed(() => this.settings.role() === 'driver');
  readonly labels = PASSENGER_LABELS;
  readonly types: PassengerType[] = ['regular', 'student', 'senior', 'pwd'];
  readonly faqs = FAQS;

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

  readonly sourceLabel = computed(() => {
    switch (this.source()) {
      case 'remote':
        return 'online (GitHub)';
      case 'cache':
        return 'saved copy on this phone';
      default:
        return 'built-in copy';
    }
  });

  constructor() {
    addIcons({ cloudDownload, cloudOffline, helpCircle, informationCircle, call, chatbubble, openOutline });
  }

  /** Opened from Account with #faq or #complaint: scroll to that section. */
  async ionViewDidEnter(): Promise<void> {
    const id = this.route.snapshot.fragment;
    const el = id ? document.getElementById(id) : null;
    if (el) await this.content()?.scrollToPoint(0, el.offsetTop - 8, 400);
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
    if (!this.online()) {
      void this.feedback.toast('You are offline. Using the saved fare matrix.', 'warning');
      return;
    }
    this.matrixService.refresh();
    void this.feedback.toast('Checking for the latest fare matrix…');
  }
}
