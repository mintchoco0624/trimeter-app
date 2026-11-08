import guideline from '../../assets/fare-matrix.json';
import type { FareMatrix } from '../models/fare-matrix';

import { FareService } from './fare';

/**
 * The bundled fare data must match the official Cabanatuan City Tricycle Fare Guidelines
 * (Ordinance No. 050-2026, dated April 14, 2026): the fare box for the base band (₱5 per succeeding km for
 * everyone) and the Section 5 table for the higher gas price bands. If the city changes the
 * fares, update assets/fare-matrix.json and these expected values together.
 */
const matrix = guideline as unknown as FareMatrix;
const fare = new FareService();

// [band id, regular base, discounted base, regular per km, discounted per km]
const SECTION_5: [string, number, number, number, number][] = [
  ['b50', 35, 28, 5, 5],
  ['b60', 37.5, 30, 5.5, 4.5],
  ['b70', 40, 32, 6, 5],
  ['b80', 42.5, 34, 6.5, 5],
  ['b90', 45, 36, 7, 5.5],
  ['b100', 47.5, 38, 7.5, 6],
  ['b110', 50, 40, 8, 6.5],
  ['b120', 52.5, 42, 8.5, 7],
  ['b130', 55, 44, 9, 7],
  ['b140', 57.5, 46, 9.5, 7.5],
  ['b150', 60, 48, 10, 8],
];

describe('bundled fare matrix (official guideline)', () => {
  it('has every gasoline price band from the Section 5 table', () => {
    expect(matrix.fuelBands.map((b) => b.id)).toEqual(SECTION_5.map((r) => r[0]));
    for (const [id, base, baseDisc, perKm, perKmDisc] of SECTION_5) {
      const band = matrix.fuelBands.find((b) => b.id === id);
      expect(band, id).toBeDefined();
      if (!band) continue;
      expect(band.baseFare).toEqual({ regular: base, discounted: baseDisc });
      expect(band.perSucceedingKm).toEqual({ regular: perKm, discounted: perKmDisc });
    }
  });

  it('uses the base band by default: ₱35 / ₱28 for the first 3 km, then +₱5 per km for everyone', () => {
    expect(matrix.defaultBandId).toBe('b50');
    expect(matrix.baseKm).toBe(3);
    expect(fare.compute(4.56, 'regular', matrix).total).toBe(45);
    expect(fare.compute(4.56, 'student', matrix).total).toBe(38); // 28 + 2 × 5
  });

  it('records the ordinance, the guideline date, the city hotline and the passenger limit', () => {
    expect(matrix.status).toBe('confirmed');
    expect(matrix.ordinanceNo).toBe('050-2026');
    expect(matrix.effectiveDate).toBe('2026-04-14');
    expect(matrix.hotline).toBe('0998-500-2726');
    expect(matrix.maxPassengers).toBe(3);
    expect(matrix.penalties).toHaveLength(3);
  });

  it('charges the highest band correctly: ₱60 + 2 km × ₱10 = ₱80', () => {
    expect(fare.compute(4.56, 'regular', matrix, 'b150').total).toBe(80);
  });
});
