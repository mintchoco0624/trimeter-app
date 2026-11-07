import { Service } from '@angular/core';

import type { FareBreakdown, FareMatrix, FuelBand, PassengerType } from '../models/fare-matrix';

/**
 * Computes a tricycle fare from a distance, following the city fare matrix:
 *
 *   total = base fare (covers the first `baseKm` km)
 *         + every succeeding km x rate per km
 *
 * A part of a succeeding kilometre (0.01 to 1.00 km) is charged as a full kilometre.
 * Students, seniors and PWDs pay the "discounted" column of the matrix.
 */
@Service()
export class FareService {
  compute(distanceKm: number, passengerType: PassengerType, matrix: FareMatrix, bandId?: string): FareBreakdown {
    const band = this.findBand(matrix, bandId);
    const discounted = matrix.discountedTypes.includes(passengerType);
    const column: keyof FuelBand['baseFare'] = discounted ? 'discounted' : 'regular';

    // Round to 10 m first so GPS noise like 3.0004 km is not billed as an extra kilometre.
    const km = Math.max(0, Math.round(distanceKm * 100) / 100);
    const succeedingKm = Math.max(0, Math.ceil(km - matrix.baseKm - 1e-9));

    const baseFare = band.baseFare[column];
    const succeedingRate = band.perSucceedingKm[column];
    const succeedingFare = succeedingKm * succeedingRate;
    const total = baseFare + succeedingFare;

    const regularTotal = band.baseFare.regular + succeedingKm * band.perSucceedingKm.regular;

    return {
      distanceKm: km,
      baseKm: matrix.baseKm,
      baseFare,
      succeedingKm,
      succeedingRate,
      succeedingFare,
      total,
      regularTotal,
      regularBaseFare: band.baseFare.regular,
      regularSucceedingRate: band.perSucceedingKm.regular,
      savings: regularTotal - total,
      passengerType,
      discounted,
      bandId: band.id,
      bandLabel: band.label,
    };
  }

  /** Returns how much more than the fair fare the driver asked for (0 when it was fair). */
  overcharge(fairFare: number, asked: number): { amount: number; percent: number } {
    const amount = Math.max(0, asked - fairFare);
    const percent = fairFare > 0 ? Math.round((amount / fairFare) * 100) : 0;
    return { amount, percent };
  }

  findBand(matrix: FareMatrix, bandId?: string): FuelBand {
    return (
      matrix.fuelBands.find((b) => b.id === bandId) ??
      matrix.fuelBands.find((b) => b.id === matrix.defaultBandId) ??
      matrix.fuelBands[0]
    );
  }
}
