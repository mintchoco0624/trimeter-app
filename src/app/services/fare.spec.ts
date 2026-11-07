import { TestBed } from '@angular/core/testing';

import type { FareMatrix } from '../models/fare-matrix';

import { FareService } from './fare';

/** Small matrix with the Ordinance 050-2026 base band and one higher gas band. */
const MATRIX: FareMatrix = {
  version: 'test',
  city: 'Cabanatuan City',
  ordinance: 'Test',
  ordinanceNo: '050-2026',
  effectiveDate: null,
  effectiveNote: 'Not confirmed',
  status: 'unconfirmed',
  statusNote: '',
  updatedAt: '2026-11-06',
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
    {
      id: 'b70',
      label: '70s',
      minPrice: 70,
      maxPrice: 79.99,
      baseFare: { regular: 40, discounted: 32 },
      perSucceedingKm: { regular: 6, discounted: 5 },
    },
  ],
  hotline: '',
  sources: [],
};

describe('FareService', () => {
  let service: FareService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FareService);
  });

  it('charges only the base fare for 0 km (minimum fare)', () => {
    expect(service.compute(0, 'regular', MATRIX).total).toBe(35);
  });

  it('charges only the base fare up to exactly 3 km', () => {
    const f = service.compute(3, 'regular', MATRIX);
    expect(f.succeedingKm).toBe(0);
    expect(f.total).toBe(35);
  });

  it('charges a part of a kilometre as a full kilometre', () => {
    const f = service.compute(3.2, 'regular', MATRIX);
    expect(f.succeedingKm).toBe(1);
    expect(f.total).toBe(40);
  });

  it('ignores GPS noise below 10 m past the base distance', () => {
    expect(service.compute(3.004, 'regular', MATRIX).total).toBe(35);
  });

  it('adds the per-km rate for each succeeding kilometre', () => {
    // 7.5 km -> 4.5 succeeding km -> billed as 5 km
    const f = service.compute(7.5, 'regular', MATRIX);
    expect(f.succeedingKm).toBe(5);
    expect(f.total).toBe(35 + 5 * 5);
  });

  it('uses the discounted column for students, seniors and PWDs', () => {
    for (const type of ['student', 'senior', 'pwd'] as const) {
      const f = service.compute(5, type, MATRIX);
      expect(f.discounted).toBe(true);
      expect(f.total).toBe(28 + 2 * 4);
      expect(f.regularTotal).toBe(45);
      expect(f.savings).toBe(9);
    }
  });

  it('applies the selected gas price band', () => {
    expect(service.compute(5, 'regular', MATRIX, 'b70').total).toBe(40 + 2 * 6);
  });

  it('falls back to the default band for an unknown band id', () => {
    expect(service.compute(5, 'regular', MATRIX, 'nope').bandId).toBe('b50');
  });

  it('computes the overcharge amount and percentage', () => {
    expect(service.overcharge(40, 60)).toEqual({ amount: 20, percent: 50 });
    expect(service.overcharge(40, 35)).toEqual({ amount: 0, percent: 0 });
  });

  it('stores the regular rates and the discount amount for the receipt', () => {
    const b = service.compute(4.56, 'senior', MATRIX);
    expect(b.regularBaseFare).toBe(35);
    expect(b.regularSucceedingRate).toBe(5);
    expect(b.regularTotal).toBe(45);
    expect(b.savings).toBe(9);
    expect(service.compute(4.56, 'regular', MATRIX).savings).toBe(0);
  });
});
