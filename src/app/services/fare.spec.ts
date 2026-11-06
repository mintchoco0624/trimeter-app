import { TestBed } from '@angular/core/testing';
import { Fare } from './fare';

describe('Fare', () => {
  let service: Fare;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Fare);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
