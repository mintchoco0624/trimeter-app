/** Who is riding. Students, seniors and PWDs get the discounted column of the matrix. */
export type PassengerType = 'regular' | 'student' | 'senior' | 'pwd';

/** One row of the matrix: the regular rate and the discounted rate, in pesos. */
export interface FareRate {
  regular: number;
  discounted: number;
}

/** A gasoline-price band. The city raises the fare in steps as the pump price goes up. */
export interface FuelBand {
  id: string;
  label: string;
  minPrice: number;
  maxPrice: number;
  baseFare: FareRate;
  perSucceedingKm: FareRate;
}

export interface FareSource {
  label: string;
  url: string;
}

/** The fare matrix as stored in assets/fare-matrix.json (and the same file on GitHub). */
export interface FareMatrix {
  version: string;
  city: string;
  ordinance: string;
  /** e.g. "050-2026". */
  ordinanceNo: string;
  /** ISO date the fares took effect, or null while it is not confirmed. Never guessed. */
  effectiveDate: string | null;
  /** Why the effective date is missing, shown next to "Not confirmed". */
  effectiveNote: string;
  /** "unconfirmed" until the group verifies the figures with the city's certified copy. */
  status: 'confirmed' | 'unconfirmed';
  statusNote: string;
  updatedAt: string;
  /** Kilometres covered by the base (minimum) fare. */
  baseKm: number;
  discountedTypes: PassengerType[];
  /** Id of the band used when the user has not picked one. */
  defaultBandId: string;
  fuelBands: FuelBand[];
  /** A complaint hotline, shown only when it has been verified. Empty = not shown. */
  hotline?: string;
  sources: FareSource[];
}

/** Every number shown on the receipt, so the fare can be explained line by line. */
export interface FareBreakdown {
  distanceKm: number;
  baseKm: number;
  baseFare: number;
  succeedingKm: number;
  succeedingRate: number;
  succeedingFare: number;
  total: number;
  /** What a regular passenger would pay for the same distance. */
  regularTotal: number;
  /** Regular-column rates, so a receipt can show "regular fare, minus discount". Missing on older trips. */
  regularBaseFare?: number;
  regularSucceedingRate?: number;
  /** Discount = regularTotal - total (0 for regular passengers). */
  savings: number;
  passengerType: PassengerType;
  discounted: boolean;
  bandId: string;
  bandLabel: string;
}

export const PASSENGER_LABELS: Record<PassengerType, string> = {
  regular: 'Regular',
  student: 'Student',
  senior: 'Senior citizen',
  pwd: 'PWD',
};
