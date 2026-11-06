import { TestBed } from '@angular/core/testing';

import { testProviders } from '../../testing/test-providers';

import { FareMatrixService } from './fare-matrix';

describe('FareMatrixService', () => {
  let service: FareMatrixService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: testProviders });
    service = TestBed.inject(FareMatrixService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
