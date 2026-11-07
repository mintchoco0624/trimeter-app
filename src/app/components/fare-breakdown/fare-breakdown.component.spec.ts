import { TestBed } from '@angular/core/testing';

import type { FareMatrix } from '../../models/fare-matrix';
import { FareService } from '../../services/fare';

import { FareBreakdownComponent, breakdownRows } from './fare-breakdown.component';

const matrix = {
  baseKm: 3,
  discountedTypes: ['student', 'senior', 'pwd'],
  defaultBandId: 'b50',
  fuelBands: [
    {
      id: 'b50',
      label: 'base',
      minPrice: 50,
      maxPrice: 59.99,
      baseFare: { regular: 35, discounted: 28 },
      perSucceedingKm: { regular: 5, discounted: 4 },
    },
  ],
} as unknown as FareMatrix;

const fare = new FareService();

describe('breakdownRows', () => {
  it('regular passenger: base + additional distance = final', () => {
    const rows = breakdownRows(fare.compute(4.56, 'regular', matrix));
    expect(rows.map((r) => [r.kind, r.amount])).toEqual([
      ['charge', 35],
      ['charge', 10],
      ['total', 45],
    ]);
  });

  it('student: regular fare, minus the discount, gives the final fare', () => {
    const rows = breakdownRows(fare.compute(4.56, 'student', matrix));
    expect(rows.map((r) => [r.label, r.amount])).toEqual([
      ['Base fare (first 3 km)', 35],
      ['Additional distance: 2 km × ₱5', 10],
      ['Regular fare', 45],
      ['Student discount', -9],
      ['Final fare', 36],
    ]);
  });

  it('older trips without regular rates still add up', () => {
    const b = fare.compute(4.56, 'senior', matrix);
    delete b.regularBaseFare;
    delete b.regularSucceedingRate;
    const rows = breakdownRows(b);
    expect(rows.at(-1)).toEqual({ label: 'Final fare', amount: 36, kind: 'total' });
  });
});

describe('FareBreakdownComponent', () => {
  it('renders the rows and the charged kilometres', () => {
    const fixture = TestBed.createComponent(FareBreakdownComponent);
    fixture.componentRef.setInput('breakdown', fare.compute(4.56, 'pwd', matrix));
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('charged as 5 km');
    expect(text).toContain('PWD discount');
    expect(text).toContain('₱36');
  });
});
