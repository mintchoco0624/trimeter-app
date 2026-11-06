import { TestBed } from '@angular/core/testing';

import { testProviders } from '../../testing/test-providers';

import { TripStorageService } from './trip-storage';

describe('TripStorageService', () => {
  let service: TripStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: testProviders });
    service = TestBed.inject(TripStorageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
