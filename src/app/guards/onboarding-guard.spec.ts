import { TestBed } from '@angular/core/testing';
import { type ActivatedRouteSnapshot, type CanActivateFn, type RouterStateSnapshot, UrlTree } from '@angular/router';

import { testProviders } from '../../testing/test-providers';
import { SettingsService } from '../services/settings';

import { onboardingGuard } from './onboarding-guard';

describe('onboardingGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => onboardingGuard(...guardParameters));
  const run = () => executeGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot) as Promise<boolean | UrlTree>;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: testProviders });
  });

  it('redirects first-time users to onboarding', async () => {
    const result = await run();
    expect(result instanceof UrlTree).toBe(true);
    expect(result.toString()).toBe('/onboarding');
  });

  it('lets users through after onboarding', async () => {
    await TestBed.inject(SettingsService).completeOnboarding();
    expect(await run()).toBe(true);
  });
});
