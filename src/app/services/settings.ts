import { Service, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

import type { PassengerType } from '../models/fare-matrix';

const KEYS = {
  passengerType: 'trimeter.passengerType',
  fuelBand: 'trimeter.fuelBand',
  onboarded: 'trimeter.onboarded',
};

/** User choices that change the fare, saved on the device with Capacitor Preferences. */
@Service()
export class SettingsService {
  readonly passengerType = signal<PassengerType>('regular');
  /** Empty = use the matrix's default band. */
  readonly fuelBandId = signal<string>('');
  readonly onboarded = signal(false);

  private loaded = false;

  async load(): Promise<void> {
    if (this.loaded) return;
    const [type, band, done] = await Promise.all([
      Preferences.get({ key: KEYS.passengerType }),
      Preferences.get({ key: KEYS.fuelBand }),
      Preferences.get({ key: KEYS.onboarded }),
    ]);
    if (type.value) this.passengerType.set(type.value as PassengerType);
    this.fuelBandId.set(band.value ?? '');
    this.onboarded.set(done.value === 'true');
    this.loaded = true;
  }

  async setPassengerType(type: PassengerType): Promise<void> {
    this.passengerType.set(type);
    await Preferences.set({ key: KEYS.passengerType, value: type });
  }

  async setFuelBand(id: string): Promise<void> {
    this.fuelBandId.set(id);
    await Preferences.set({ key: KEYS.fuelBand, value: id });
  }

  async completeOnboarding(): Promise<void> {
    this.onboarded.set(true);
    await Preferences.set({ key: KEYS.onboarded, value: 'true' });
  }
}
