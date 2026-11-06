import { TestBed } from '@angular/core/testing';

import { testProviders } from '../../testing/test-providers';

import { GeocodeService } from './geocode';

describe('GeocodeService', () => {
  let service: GeocodeService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: testProviders });
    service = TestBed.inject(GeocodeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
