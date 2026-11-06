import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';

import { SettingsService } from '../services/settings';

/** Sends first-time users to the onboarding screen before they can open the meter. */
export const onboardingGuard: CanActivateFn = async () => {
  // inject() only works before the first await, so get both services up front.
  const settings = inject(SettingsService);
  const router = inject(Router);
  await settings.load();
  return settings.onboarded() ? true : router.parseUrl('/onboarding');
};
