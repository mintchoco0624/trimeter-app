import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { accessibility, arrowForward, briefcase, cash, location, school, shieldCheckmark, walk } from 'ionicons/icons';

import { PASSENGER_LABELS, type PassengerType } from '../../models/fare-matrix';
import { SettingsService } from '../../services/settings';

interface PassengerOption {
  type: PassengerType;
  icon: string;
  hint: string;
}

/** First-run screen: what TriMeter does, how to use it, and who is riding (sets the discount). */
@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.page.html',
  styleUrls: ['./onboarding.page.scss'],
  imports: [IonContent, IonButton, IonIcon],
})
export class OnboardingPage {
  private settings = inject(SettingsService);
  private router = inject(Router);

  readonly step = signal(0);
  readonly lastStep = 2;
  readonly selected = signal<PassengerType>(this.settings.passengerType());
  readonly labels = PASSENGER_LABELS;

  readonly options: PassengerOption[] = [
    { type: 'regular', icon: 'briefcase', hint: 'Regular fare' },
    { type: 'student', icon: 'school', hint: 'Discounted, show school ID' },
    { type: 'senior', icon: 'walk', hint: 'Discounted, show senior ID' },
    { type: 'pwd', icon: 'accessibility', hint: 'Discounted, show PWD ID' },
  ];

  constructor() {
    addIcons({ arrowForward, location, cash, shieldCheckmark, briefcase, school, walk, accessibility });
  }

  next(): void {
    this.step.update((s) => Math.min(this.lastStep, s + 1));
  }

  back(): void {
    this.step.update((s) => Math.max(0, s - 1));
  }

  async finish(): Promise<void> {
    await this.settings.setPassengerType(this.selected());
    await this.settings.completeOnboarding();
    await this.router.navigateByUrl('/tabs/meter', { replaceUrl: true });
  }
}
