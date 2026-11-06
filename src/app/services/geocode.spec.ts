import { TestBed } from '@angular/core/testing';
import { Geocode } from './geocode';

describe('Geocode', () => {
  let service: Geocode;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Geocode);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
