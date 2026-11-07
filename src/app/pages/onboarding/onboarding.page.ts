import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  accessibility,
  arrowForward,
  briefcase,
  car,
  cash,
  location,
  receipt,
  school,
  shieldCheckmark,
  walk,
} from 'ionicons/icons';

import { PASSENGER_LABELS, type PassengerType } from '../../models/fare-matrix';
import type { AppRole } from '../../models/profile';
import { SettingsService } from '../../services/settings';

interface PassengerOption {
  type: PassengerType;
  icon: string;
  hint: string;
}

interface RoleOption {
  role: AppRole;
  icon: string;
  title: string;
  hint: string;
}

/** The screens of the first-run flow. Drivers skip "passenger" (they choose it for each trip). */
export type OnboardingStep = 'welcome' | 'role' | 'how' | 'passenger';

export function stepsFor(role: AppRole): OnboardingStep[] {
  return role === 'driver' ? ['welcome', 'role', 'how'] : ['welcome', 'role', 'how', 'passenger'];
}

/** First-run screen: what TriMeter does, the user's role, how to use it, and who is riding. */
@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.page.html',
  styleUrls: ['./onboarding.page.scss'],
  imports: [IonContent, IonButton, IonIcon],
})
export class OnboardingPage {
  private settings = inject(SettingsService);
  private router = inject(Router);

  readonly role = signal<AppRole>(this.settings.role());
  readonly steps = computed(() => stepsFor(this.role()));
  readonly index = signal(0);
  readonly step = computed(() => this.steps()[this.index()]);
  readonly isLast = computed(() => this.index() === this.steps().length - 1);

  readonly selected = signal<PassengerType>(this.settings.passengerType());
  readonly labels = PASSENGER_LABELS;

  readonly roles: RoleOption[] = [
    { role: 'commuter', icon: 'walk', title: 'Commuter', hint: 'Check the fair fare for my ride' },
    { role: 'driver', icon: 'car', title: 'Tricycle driver', hint: 'Meter and record my trips' },
  ];

  readonly options: PassengerOption[] = [
    { type: 'regular', icon: 'briefcase', hint: 'Regular fare' },
    { type: 'student', icon: 'school', hint: 'Discounted, show school ID' },
    { type: 'senior', icon: 'walk', hint: 'Discounted, show senior ID' },
    { type: 'pwd', icon: 'accessibility', hint: 'Discounted, show PWD ID' },
  ];

  constructor() {
    addIcons({ arrowForward, location, cash, shieldCheckmark, briefcase, school, walk, accessibility, car, receipt });
  }

  next(): void {
    this.index.update((i) => Math.min(this.steps().length - 1, i + 1));
  }

  back(): void {
    this.index.update((i) => Math.max(0, i - 1));
  }

  async finish(): Promise<void> {
    await this.settings.setRole(this.role());
    if (this.role() === 'commuter') await this.settings.setPassengerType(this.selected());
    await this.settings.completeOnboarding();
    await this.router.navigateByUrl('/tabs/meter', { replaceUrl: true });
  }
}
