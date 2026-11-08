import { TestBed } from '@angular/core/testing';
import { Preferences } from '@capacitor/preferences';

import { type ActiveTrip, MAX_RESUME_AGE_MS, TripRecoveryService } from './trip-recovery';

const NOW = Date.UTC(2026, 10, 8, 7, 0, 0);

const trip: ActiveTrip = {
  startedAt: NOW - 5 * 60 * 1000,
  savedAt: NOW - 10 * 1000,
  points: [
    { lat: 15.461, lng: 120.948, acc: 6, t: NOW - 300000 },
    { lat: 15.47, lng: 120.95, acc: 6, t: NOW - 10000 },
  ],
  distanceKm: 1.2,
  passenger: 'student',
  role: 'driver',
};

describe('TripRecoveryService', () => {
  let service: TripRecoveryService;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(TripRecoveryService);
  });

  it('returns nothing when no trip was interrupted', async () => {
    expect(await service.load(NOW)).toBeNull();
  });

  it('saves and loads the trip in progress', async () => {
    await service.save(trip);
    expect(await service.load(NOW)).toEqual(trip);
  });

  it('forgets the trip once it is cleared', async () => {
    await service.save(trip);
    await service.clear();
    expect(await service.load(NOW)).toBeNull();
  });

  it('does not offer a trip older than 12 hours, and removes it', async () => {
    await service.save({ ...trip, savedAt: NOW - MAX_RESUME_AGE_MS - 1 });
    expect(await service.load(NOW)).toBeNull();
    expect((await Preferences.get({ key: 'trimeter.activeTrip' })).value).toBeNull();
  });

  it('ignores and removes a corrupt snapshot', async () => {
    await Preferences.set({ key: 'trimeter.activeTrip', value: '{not json' });
    expect(await service.load(NOW)).toBeNull();
    expect((await Preferences.get({ key: 'trimeter.activeTrip' })).value).toBeNull();
  });
});
