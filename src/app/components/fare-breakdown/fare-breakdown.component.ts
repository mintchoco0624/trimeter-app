import { DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';

import { type FareBreakdown, PASSENGER_LABELS } from '../../models/fare-matrix';
import { PesoPipe, formatPeso } from '../../pipes/peso-pipe';

/** One line of the breakdown table. */
export interface BreakdownRow {
  label: string;
  amount: number;
  kind: 'charge' | 'subtotal' | 'discount' | 'total';
}

/**
 * Turns a fare breakdown into receipt lines:
 *   Base fare (first 3 km) + Additional distance = Regular fare, minus Discount = Final fare.
 * Trips saved before regular rates were stored fall back to the rates that were applied.
 */
export function breakdownRows(b: FareBreakdown): BreakdownRow[] {
  const label = PASSENGER_LABELS[b.passengerType];
  const hasRegular = b.regularBaseFare !== undefined && b.regularSucceedingRate !== undefined;

  if (!b.discounted || !hasRegular) {
    const rows: BreakdownRow[] = [
      { label: `Base fare (first ${b.baseKm} km)`, amount: b.baseFare, kind: 'charge' },
      {
        label: `Additional distance: ${b.succeedingKm} km × ${formatPeso(b.succeedingRate)}`,
        amount: b.succeedingFare,
        kind: 'charge',
      },
    ];
    if (b.discounted) rows.push({ label: `${label} rate applied`, amount: -b.savings, kind: 'discount' });
    rows.push({ label: 'Final fare', amount: b.total, kind: 'total' });
    return rows;
  }

  const regularExtra = b.succeedingKm * b.regularSucceedingRate!;
  return [
    { label: `Base fare (first ${b.baseKm} km)`, amount: b.regularBaseFare!, kind: 'charge' },
    {
      label: `Additional distance: ${b.succeedingKm} km × ${formatPeso(b.regularSucceedingRate)}`,
      amount: regularExtra,
      kind: 'charge',
    },
    { label: 'Regular fare', amount: b.regularTotal, kind: 'subtotal' },
    { label: `${label} discount`, amount: -b.savings, kind: 'discount' },
    { label: 'Final fare', amount: b.total, kind: 'total' },
  ];
}

/** Line-by-line fare explanation, used on the receipt, the fare calculator and the Meter preview. */
@Component({
  selector: 'app-fare-breakdown',
  templateUrl: './fare-breakdown.component.html',
  styleUrls: ['./fare-breakdown.component.scss'],
  imports: [PesoPipe, DecimalPipe],
})
export class FareBreakdownComponent {
  readonly breakdown = input.required<FareBreakdown>();
  /** Show the distance line at the top (hidden where the distance is already shown big). */
  readonly showDistance = input(true);

  readonly rows = computed(() => breakdownRows(this.breakdown()));
  /** Kilometres charged: the base kilometres plus every started succeeding kilometre. */
  readonly chargedKm = computed(() => {
    const b = this.breakdown();
    return b.distanceKm <= b.baseKm ? b.baseKm : b.baseKm + b.succeedingKm;
  });
}
