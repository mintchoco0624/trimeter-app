import { TestBed } from '@angular/core/testing';

import { testProviders } from '../../testing/test-providers';

import { SettingsService } from './settings';

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: testProviders });
    service = TestBed.inject(SettingsService);
  });

  it('starts as a commuter with the regular fare', async () => {
    await service.load();
    expect(service.role()).toBe('commuter');
    expect(service.passengerType()).toBe('regular');
    expect(service.onboarded()).toBe(false);
  });

  it('saves the role and passenger type so they survive an app restart', async () => {
    await service.setRole('driver');
    await service.setPassengerType('student');
    await service.setDisplayName('  Juan  ');

    // A fresh service reads the values back from storage.
    const restarted = new SettingsService();
    await restarted.load();
    expect(restarted.role()).toBe('driver');
    expect(restarted.passengerType()).toBe('student');
    expect(restarted.displayName()).toBe('Juan');
  });

  it('logout clears the profile but not the gas price band', async () => {
    await service.setRole('driver');
    await service.setFuelBand('b70');
    await service.completeOnboarding();

    await service.logout();

    const restarted = new SettingsService();
    await restarted.load();
    expect(restarted.onboarded()).toBe(false);
    expect(restarted.role()).toBe('commuter');
    expect(restarted.fuelBandId()).toBe('b70');
  });
});
