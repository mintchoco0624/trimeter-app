import { TestBed } from '@angular/core/testing';

import type { TrackPoint } from '../models/trip';

import { LocationService, MIN_TRIP_KM, gpsQuality, haversineKm, judgeFix } from './location';

// Two real points in Cabanatuan City.
const SM_CITY = { lat: 15.4697, lng: 120.9502 };
const CITY_HALL = { lat: 15.4887, lng: 120.9667 };

const point = (lat: number, lng: number, t: number, acc = 8): TrackPoint => ({ lat, lng, t, acc });

describe('haversineKm', () => {
  it('is 0 for the same point', () => {
    expect(haversineKm(SM_CITY, SM_CITY)).toBe(0);
  });

  it('measures about 2.8 km between SM City and the City Hall area', () => {
    const km = haversineKm(SM_CITY, CITY_HALL);
    expect(km).toBeGreaterThan(2.6);
    expect(km).toBeLessThan(3.0);
  });

  it('measures 0.001 degree of latitude as about 111 m', () => {
    const m = haversineKm({ lat: 15.48, lng: 120.96 }, { lat: 15.481, lng: 120.96 }) * 1000;
    expect(m).toBeCloseTo(111.2, 0);
  });
});

describe('judgeFix', () => {
  it('accepts the first accurate fix', () => {
    expect(judgeFix(undefined, point(15.48, 120.96, 0))).toEqual({ accept: true, stepM: 0 });
  });

  it('rejects inaccurate fixes', () => {
    expect(judgeFix(undefined, point(15.48, 120.96, 0, 80))).toEqual({ accept: false, reason: 'inaccurate' });
  });

  it('rejects jitter smaller than 5 m', () => {
    const a = point(15.48, 120.96, 0);
    const b = point(15.48002, 120.96, 2000); // about 2 m
    expect(judgeFix(a, b)).toEqual({ accept: false, reason: 'jitter' });
  });

  it('rejects impossible jumps', () => {
    const a = point(15.48, 120.96, 0);
    const b = point(15.49, 120.96, 2000); // about 1.1 km in 2 s
    expect(judgeFix(a, b)).toEqual({ accept: false, reason: 'jump' });
  });

  it('accepts normal tricycle movement', () => {
    const a = point(15.48, 120.96, 0);
    const b = point(15.4801, 120.96, 2000); // about 11 m in 2 s (20 km/h)
    const d = judgeFix(a, b);
    expect(d.accept).toBe(true);
  });
});

describe('LocationService.addFix', () => {
  let service: LocationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LocationService);
  });

  it('adds up distance only from accepted fixes', () => {
    service.addFix(point(15.48, 120.96, 0));
    service.addFix(point(15.48002, 120.96, 1000)); // jitter, ignored
    service.addFix(point(15.4801, 120.96, 3000)); // about 11 m
    service.addFix(point(15.4802, 120.96, 5000, 90)); // inaccurate, ignored
    service.addFix(point(15.4802, 120.96, 7000)); // about 11 m
    expect(service.points().length).toBe(3);
    expect(service.distanceKm()).toBeCloseTo(0.0222, 3);
  });

  it('flags a weak signal', () => {
    service.addFix(point(15.48, 120.96, 0, 120));
    expect(service.weakSignal()).toBe(true);
  });
});

describe('gpsQuality', () => {
  it('rates the signal from the accuracy radius', () => {
    expect(gpsQuality(null)).toBe('none');
    expect(gpsQuality(6)).toBe('strong');
    expect(gpsQuality(25)).toBe('fair');
    expect(gpsQuality(60)).toBe('weak');
  });

  it('treats under 50 m as no trip distance', () => {
    expect(MIN_TRIP_KM).toBe(0.05);
  });
});

describe('LocationService.resume', () => {
  let service: LocationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LocationService);
    vi.spyOn(service, 'ensurePermission').mockResolvedValue();
    // Capacitor plugins are proxies, so stub the service's own GPS watch instead of the plugin.
    vi.spyOn(service as unknown as { watch: () => Promise<void> }, 'watch').mockImplementation(async () => {
      service.tracking.set(true);
    });
  });

  it('restores the saved route and keeps counting from the last point', async () => {
    const saved = [point(15.48, 120.96, 0), point(15.4801, 120.96, 3000)];
    await service.resume(saved, 0.5);

    expect(service.tracking()).toBe(true);
    expect(service.points()).toEqual(saved);
    expect(service.distanceKm()).toBe(0.5);

    service.addFix(point(15.4802, 120.96, 6000)); // about 11 m after the last saved point
    expect(service.distanceKm()).toBeCloseTo(0.511, 3);
  });
});
