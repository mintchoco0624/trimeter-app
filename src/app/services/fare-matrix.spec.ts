import { TestBed } from '@angular/core/testing';
import { FareMatrix } from './fare-matrix';

describe('FareMatrix', () => {
  let service: FareMatrix;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FareMatrix);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
