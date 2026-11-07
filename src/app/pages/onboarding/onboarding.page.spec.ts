import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { testProviders } from '../../../testing/test-providers';
import { SettingsService } from '../../services/settings';

import { OnboardingPage, stepsFor } from './onboarding.page';

describe('stepsFor', () => {
  it('asks commuters who is riding, but not drivers (they choose per trip)', () => {
    expect(stepsFor('commuter')).toEqual(['welcome', 'role', 'how', 'passenger']);
    expect(stepsFor('driver')).toEqual(['welcome', 'role', 'how']);
  });
});

describe('OnboardingPage', () => {
  let component: OnboardingPage;
  let fixture: ComponentFixture<OnboardingPage>;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: testProviders });
    fixture = TestBed.createComponent(OnboardingPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('saves the chosen role and passenger type when finished', async () => {
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    component.role.set('commuter');
    component.selected.set('pwd');
    await component.finish();

    const settings = TestBed.inject(SettingsService);
    expect(settings.role()).toBe('commuter');
    expect(settings.passengerType()).toBe('pwd');
    expect(settings.onboarded()).toBe(true);
  });

  it('a driver finishes after "How it works"', () => {
    component.role.set('driver');
    component.next();
    component.next();
    expect(component.step()).toBe('how');
    expect(component.isLast()).toBe(true);
  });
});
