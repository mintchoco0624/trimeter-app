import { expect, test } from '@playwright/test';

import { MOCK_GEOLOCATION, densify, loadRoute, pushFix } from './mock-gps';

test.beforeEach(async ({ context }) => {
  await context.addInitScript(MOCK_GEOLOCATION);
});

async function finishOnboarding(page: import('@playwright/test').Page, type: string) {
  await page.goto('/');
  await expect(page.getByTestId('step-welcome')).toBeVisible();
  await page.getByTestId('next').click();
  await page.getByTestId('next').click();
  await page.getByText(type, { exact: true }).click();
  await page.getByTestId('get-started').click();
  await expect(page.getByTestId('start')).toBeVisible();
}

test('first run shows onboarding, then the meter with the minimum fare', async ({ page }) => {
  await finishOnboarding(page, 'Regular');
  await expect(page.getByTestId('distance')).toHaveText(/0\.00/);
  await expect(page.getByTestId('fare')).toHaveText('₱35');
});

test('a 4.56 km GPS trip is metered, saved, shown in history and deletable', async ({ page }) => {
  await finishOnboarding(page, 'Regular');

  const fixes = densify(loadRoute(), 12);
  let t = Date.now();
  await pushFix(page, fixes[0], t);
  await page.getByTestId('start').click();
  await expect(page.getByTestId('end')).toBeVisible();

  for (const fix of fixes) {
    t += 1000; // one fix per second, about 43 km/h
    await pushFix(page, fix, t);
  }
  // 4.56 km = base 3 km + 2 succeeding km -> 35 + 2 x 5
  await expect(page.getByTestId('distance')).toHaveText(/4\.5\d/);
  await expect(page.getByTestId('fare')).toHaveText('₱45');

  await page.getByTestId('end').click();
  await page.locator('ion-alert button', { hasText: 'End trip' }).click();
  await expect(page.getByTestId('receipt-total')).toHaveText('₱45', { timeout: 20000 });

  // Overcharge check
  await page.locator('[data-testid=asked] input').fill('90');
  await expect(page.getByText('Overcharged by ₱45 (100%).')).toBeVisible();

  // History (local storage) survives a reload
  await page.goto('/tabs/history');
  await page.reload();
  await expect(page.getByTestId('trip-card')).toHaveCount(1);

  // Delete from the receipt
  await page.getByTestId('trip-card').click();
  await page.getByText('Delete trip').click();
  await page.locator('ion-alert button', { hasText: 'Delete' }).click();
  await expect(page.getByTestId('empty-history')).toBeVisible();
});

test('students pay the discounted fare', async ({ page }) => {
  await finishOnboarding(page, 'Student');
  await expect(page.getByTestId('fare')).toHaveText('₱28');
});

test('jitter while standing still does not add distance', async ({ page }) => {
  await finishOnboarding(page, 'Regular');
  let t = Date.now();
  await pushFix(page, [120.9483, 15.4612], t);
  await page.getByTestId('start').click();
  for (let i = 0; i < 30; i++) {
    t += 1000;
    const wobble = (Math.random() - 0.5) * 0.00003; // about ±1.5 m
    await pushFix(page, [120.9483 + wobble, 15.4612 + wobble], t);
  }
  await expect(page.getByTestId('distance')).toHaveText(/0\.00/);
});
