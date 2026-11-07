import { Component, computed, inject, input, signal } from '@angular/core';
import { IonInput, IonLabel, IonSegment, IonSegmentButton } from '@ionic/angular';

import { type FareMatrix, PASSENGER_LABELS, type PassengerType } from '../../models/fare-matrix';
import { PesoPipe } from '../../pipes/peso-pipe';
import { FareService } from '../../services/fare';
import { FareBreakdownComponent } from '../fare-breakdown/fare-breakdown.component';

/** Longest trip the calculator accepts. Tricycles serve short trips inside the city. */
export const MAX_CALC_KM = 50;

export type DistanceCheck = { ok: true; km: number } | { ok: false; error: string };

/** Validates what the user typed in the distance box. Pure, so it is unit-tested. */
export function checkDistance(raw: string | number | null | undefined): DistanceCheck {
  const text = String(raw ?? '')
    .trim()
    .replace(',', '.');
  if (text === '') return { ok: false, error: 'Enter the distance in kilometres.' };
  const km = Number(text);
  if (!Number.isFinite(km)) return { ok: false, error: 'Use numbers only, for example 4.5.' };
  if (km <= 0) return { ok: false, error: 'The distance must be more than 0 km.' };
  if (km > MAX_CALC_KM) return { ok: false, error: `Enter ${MAX_CALC_KM} km or less. Tricycles serve short trips.` };
  return { ok: true, km };
}

/** "How much should this ride cost?" Type a distance, pick who is riding, see the breakdown. */
@Component({
  selector: 'app-fare-calculator',
  templateUrl: './fare-calculator.component.html',
  styleUrls: ['./fare-calculator.component.scss'],
  imports: [IonInput, IonSegment, IonSegmentButton, IonLabel, FareBreakdownComponent, PesoPipe],
})
export class FareCalculatorComponent {
  private fare = inject(FareService);

  readonly matrix = input.required<FareMatrix>();
  readonly bandId = input('');
  /** Passenger type selected when the calculator opens. */
  readonly initialType = input<PassengerType>('regular');

  readonly types: PassengerType[] = ['regular', 'student', 'senior', 'pwd'];
  readonly labels = PASSENGER_LABELS;

  readonly raw = signal<string>('');
  readonly typeOverride = signal<PassengerType | null>(null);
  readonly type = computed(() => this.typeOverride() ?? this.initialType());
  readonly touched = signal(false);

  readonly check = computed(() => checkDistance(this.raw()));
  readonly breakdown = computed(() => {
    const c = this.check();
    return c.ok ? this.fare.compute(c.km, this.type(), this.matrix(), this.bandId()) : null;
  });
  readonly error = computed(() => {
    const c = this.check();
    return this.touched() && !c.ok ? c.error : '';
  });

  onInput(value: string | number | null | undefined): void {
    this.raw.set(String(value ?? ''));
    this.touched.set(true);
  }

  setType(value: string | number | undefined): void {
    if (value) this.typeOverride.set(value as PassengerType);
  }
}
