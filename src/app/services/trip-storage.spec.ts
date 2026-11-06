import { TestBed } from '@angular/core/testing';
import { TripStorage } from './trip-storage';

describe('TripStorage', () => {
  let service: TripStorage;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TripStorage);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
