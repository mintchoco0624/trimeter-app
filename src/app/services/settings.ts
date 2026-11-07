import { Service, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

import type { PassengerType } from '../models/fare-matrix';
import type { AppRole } from '../models/profile';

const KEYS = {
  passengerType: 'trimeter.passengerType',
  fuelBand: 'trimeter.fuelBand',
  onboarded: 'trimeter.onboarded',
  role: 'trimeter.role',
  displayName: 'trimeter.displayName',
};

/**
 * The local profile and the choices that change the fare, saved on the device with Capacitor Preferences.
 * There is no server account: "logging out" clears this profile on the phone.
 */
@Service()
export class SettingsService {
  /** Default passenger type for commuters (drivers pick one per trip on the Meter). */
  readonly passengerType = signal<PassengerType>('regular');
  /** Empty = use the matrix's default band. */
  readonly fuelBandId = signal<string>('');
  readonly onboarded = signal(false);
  readonly role = signal<AppRole>('commuter');
  readonly displayName = signal('');

  private loaded = false;

  async load(): Promise<void> {
    if (this.loaded) return;
    const [type, band, done, role, name] = await Promise.all([
      Preferences.get({ key: KEYS.passengerType }),
      Preferences.get({ key: KEYS.fuelBand }),
      Preferences.get({ key: KEYS.onboarded }),
      Preferences.get({ key: KEYS.role }),
      Preferences.get({ key: KEYS.displayName }),
    ]);
    if (type.value) this.passengerType.set(type.value as PassengerType);
    this.fuelBandId.set(band.value ?? '');
    this.onboarded.set(done.value === 'true');
    this.role.set(role.value === 'driver' ? 'driver' : 'commuter');
    this.displayName.set(name.value ?? '');
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

  async setRole(role: AppRole): Promise<void> {
    this.role.set(role);
    await Preferences.set({ key: KEYS.role, value: role });
  }

  async setDisplayName(name: string): Promise<void> {
    const clean = name.trim().slice(0, 40);
    this.displayName.set(clean);
    await Preferences.set({ key: KEYS.displayName, value: clean });
  }

  async completeOnboarding(): Promise<void> {
    this.onboarded.set(true);
    await Preferences.set({ key: KEYS.onboarded, value: 'true' });
  }

  /** Clears the profile (role, name, passenger type) and shows onboarding again. Trip history is kept. */
  async logout(): Promise<void> {
    await Promise.all(
      [KEYS.onboarded, KEYS.role, KEYS.displayName, KEYS.passengerType].map((key) => Preferences.remove({ key })),
    );
    this.onboarded.set(false);
    this.role.set('commuter');
    this.displayName.set('');
    this.passengerType.set('regular');
  }
}
