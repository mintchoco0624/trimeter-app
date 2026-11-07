import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { testProviders } from '../../../testing/test-providers';
import type { FareMatrix } from '../../models/fare-matrix';

import { FareCalculatorComponent, MAX_CALC_KM, checkDistance } from './fare-calculator.component';

const matrix = {
  baseKm: 3,
  discountedTypes: ['student', 'senior', 'pwd'],
  defaultBandId: 'b50',
  fuelBands: [
    {
      id: 'b50',
      label: 'base',
      minPrice: 50,
      maxPrice: 59.99,
      baseFare: { regular: 35, discounted: 28 },
      perSucceedingKm: { regular: 5, discounted: 4 },
    },
  ],
} as unknown as FareMatrix;

describe('checkDistance', () => {
  it('accepts positive distances, with a dot or a comma', () => {
    expect(checkDistance('4.5')).toEqual({ ok: true, km: 4.5 });
    expect(checkDistance('4,5')).toEqual({ ok: true, km: 4.5 });
    expect(checkDistance(3)).toEqual({ ok: true, km: 3 });
  });

  it('rejects empty, non-numbers, zero, negatives and very long trips', () => {
    expect(checkDistance('').ok).toBe(false);
    expect(checkDistance('abc').ok).toBe(false);
    expect(checkDistance('0').ok).toBe(false);
    expect(checkDistance('-2').ok).toBe(false);
    expect(checkDistance(String(MAX_CALC_KM + 1)).ok).toBe(false);
  });
});

describe('FareCalculatorComponent', () => {
  let component: FareCalculatorComponent;
  let fixture: ComponentFixture<FareCalculatorComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: testProviders });
    fixture = TestBed.createComponent(FareCalculatorComponent);
    fixture.componentRef.setInput('matrix', matrix);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('computes the fare for the typed distance and passenger type', () => {
    component.onInput('4.56');
    expect(component.breakdown()?.total).toBe(45);
    component.setType('student');
    expect(component.breakdown()?.total).toBe(36);
    expect(component.breakdown()?.savings).toBe(9);
  });

  it('shows an error only after the user types something invalid', () => {
    expect(component.error()).toBe('');
    component.onInput('0');
    expect(component.error()).toContain('more than 0 km');
    expect(component.breakdown()).toBeNull();
  });
});
