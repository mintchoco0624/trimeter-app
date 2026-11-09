import { type Page, expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { MOCK_GEOLOCATION, densify, loadRoute, pushFix } from './mock-gps';

const ROOT = join(__dirname, '..');
const FARE_MATRIX = readFileSync(join(ROOT, 'src/assets/fare-matrix.json'), 'utf8');
const OSRM_ROUTE = readFileSync(join(__dirname, 'route-nepacific-neust.json'), 'utf8');
const ROUTE = loadRoute();
const [DEST_LNG, DEST_LAT] = ROUTE.at(-1)!;

/**
 * Every outside service is faked, so the tests do not depend on the internet:
 * the fare matrix on GitHub, OpenStreetMap place names and search, OSRM road routes, and map tiles.
 */
test.beforeEach(async ({ context }) => {
  await context.addInitScript(MOCK_GEOLOCATION);
  await context.route('https://raw.githubusercontent.com/**', (r) =>
    r.fulfill({ contentType: 'application/json', body: FARE_MATRIX }),
  );
  await context.route('https://nominatim.openstreetmap.org/reverse**', (r) =>
    r.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ lat: '0', lon: '0', name: 'Test place', display_name: 'Test place', address: {} }),
    }),
  );
  await context.route('https://nominatim.openstreetmap.org/search**', (r) =>
    r.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([{ lat: String(DEST_LAT), lon: String(DEST_LNG), name: 'NEUST', display_name: 'NEUST' }]),
    }),
  );
  await context.route('https://router.project-osrm.org/**', (r) =>
    r.fulfill({ contentType: 'application/json', body: OSRM_ROUTE }),
  );
  await context.route('https://tile.openstreetmap.org/**', (r) => r.abort());
});

async function finishOnboarding(page: Page, role: 'commuter' | 'driver', passenger = 'Regular') {
  await page.goto('/');
  await expect(page.getByTestId('step-welcome')).toBeVisible();
  await page.getByTestId('next').click();
  await expect(page.getByTestId('step-role')).toBeVisible();
  await page.getByTestId(`role-${role}`).click();
  await page.getByTestId('next').click();
  await expect(page.getByTestId('step-how')).toBeVisible();
  if (role === 'commuter') {
    await page.getByTestId('next').click();
    await page.getByText(passenger, { exact: true }).click();
  }
  await page.getByTestId('get-started').click();
  await expect(page.getByTestId('start')).toBeVisible();
}

/** Rides the whole 4.56 km route: one GPS fix per second. */
async function rideRoute(page: Page) {
  const fixes = densify(ROUTE, 12);
  let t = Date.now();
  for (const fix of fixes) {
    t += 1000;
    await pushFix(page, fix, t);
  }
}

test('first run: role selection, then the meter with the minimum fare', async ({ page }) => {
  await finishOnboarding(page, 'commuter');
  await expect(page.getByTestId('trip-status')).toHaveText(/Ready/);
  await expect(page.getByTestId('distance')).toHaveText(/0\.00/);
  await expect(page.getByTestId('fare')).toHaveText('₱35');
});

test('commuter: a 4.56 km GPS trip is metered, saved, searchable in history and deletable', async ({ page }) => {
  await finishOnboarding(page, 'commuter');

  await pushFix(page, ROUTE[0], Date.now());
  await page.getByTestId('start').click();
  await expect(page.getByTestId('end')).toBeVisible();
  await expect(page.getByTestId('trip-status')).toHaveText(/On trip/);

  await rideRoute(page);
  // 4.56 km = base 3 km + 2 succeeding km -> 35 + 2 x 5
  await expect(page.getByTestId('distance')).toHaveText(/4\.5\d/);
  await expect(page.getByTestId('fare')).toHaveText('₱45');

  await page.getByTestId('end').click();
  await page.locator('ion-alert button', { hasText: 'End trip' }).click();
  await expect(page.getByTestId('receipt-total')).toHaveText('₱45', { timeout: 20000 });
  await expect(page.getByTestId('receipt-status')).toHaveText('Completed');

  // Overcharge check (commuters only)
  await page.locator('[data-testid=asked] input').fill('90');
  await expect(page.getByText('Overcharged by ₱45 (100%).')).toBeVisible();

  // History (local storage) survives a reload
  await page.goto('/tabs/history');
  await page.reload();
  await expect(page.getByTestId('trip-card')).toHaveCount(1);

  // Search by place: no match, then clear
  await page.locator('[data-testid=history-search] input').fill('zzz');
  await expect(page.getByTestId('no-matches')).toBeVisible();
  await page.getByText('Clear filters').click();
  await expect(page.getByTestId('trip-card')).toHaveCount(1);

  // Delete from the receipt
  await page.getByTestId('trip-card').click();
  await page.getByText('Delete trip').click();
  await page.locator('ion-alert button', { hasText: 'Delete' }).click();
  await expect(page.getByTestId('empty-history')).toBeVisible();
});

test('commuter: choosing a destination shows the road distance and fare before the ride', async ({ page }) => {
  await finishOnboarding(page, 'commuter');
  await pushFix(page, ROUTE[0], Date.now());

  await page.locator('[data-testid=place-search] input').fill('NEUST');
  await page.getByTestId('place-result').first().click();

  await expect(page.getByTestId('destination')).toContainText('NEUST');
  // OSRM route is 4.56 km -> ₱45
  await expect(page.getByTestId('estimate')).toContainText('4.6 km');
  await expect(page.getByTestId('estimate-preview')).toHaveText('₱45');
});

test('manual estimate starts from your location, so only the drop-off is needed', async ({ page }) => {
  await finishOnboarding(page, 'commuter');
  await pushFix(page, ROUTE[0], Date.now());
  await page.getByTestId('manual').click();

  await expect(page.getByTestId('pickup')).toContainText('Your location');
  await expect(page.getByTestId('estimate-instruction')).toContainText('drop-off (B)');

  await page.locator('app-estimate [data-testid=place-search] input').fill('NEUST');
  await page.locator('app-estimate [data-testid=place-result]').first().click();

  await expect(page.getByTestId('dropoff')).toContainText('NEUST');
  await expect(page.getByTestId('estimate-fare')).toHaveText('₱45');
  await expect(page.getByTestId('estimate-passenger')).toContainText('Regular');
});

test('driver: picks the passenger per trip, and the record has no overcharge check', async ({ page }) => {
  await finishOnboarding(page, 'driver');
  await expect(page.getByTestId('role-badge')).toBeVisible();
  await expect(page.getByTestId('tab-history')).toContainText('Trips');

  await page.getByTestId('driver-passenger').locator('ion-segment-button', { hasText: 'Student' }).click();
  await expect(page.getByTestId('fare')).toHaveText('₱28');

  await pushFix(page, ROUTE[0], Date.now());
  await page.getByTestId('start').click();
  await rideRoute(page);
  // Student: 28 + 2 x 5
  await expect(page.getByTestId('fare')).toHaveText('₱38');

  await page.getByTestId('end').click();
  await page.locator('ion-alert button', { hasText: 'End trip' }).click();
  await expect(page.getByTestId('receipt-total')).toHaveText('₱38', { timeout: 20000 });
  await expect(page.getByText('Student discount')).toBeVisible();
  await expect(page.getByTestId('asked')).toHaveCount(0);
});

test('an interrupted trip can be resumed after the app restarts', async ({ page }) => {
  await finishOnboarding(page, 'commuter');
  const fixes = densify(ROUTE, 12);
  const half = Math.floor(fixes.length / 2);
  let t = Date.now();
  await pushFix(page, fixes[0], t);
  await page.getByTestId('start').click();
  await expect(page.getByTestId('end')).toBeVisible();
  for (const fix of fixes.slice(0, half)) {
    t += 1000;
    await pushFix(page, fix, t);
  }
  const before = (await page.getByTestId('distance').textContent())?.trim() ?? '';
  // The trip is saved every 5 seconds; wait for one snapshot, then "close" the app.
  await page.waitForTimeout(5500);
  await page.reload();

  await expect(page.locator('ion-alert')).toContainText('Unfinished trip');
  await page.locator('ion-alert button', { hasText: 'Resume' }).click();
  await expect(page.getByTestId('trip-status')).toHaveText(/On trip/);
  await expect(page.getByTestId('distance')).toHaveText(before);
  await page.waitForTimeout(1000); // let the GPS watch restart before new fixes arrive

  for (const fix of fixes.slice(half)) {
    t += 1000;
    await pushFix(page, fix, t);
  }
  await expect(page.getByTestId('distance')).toHaveText(/4\.5\d/);
  await expect(page.getByTestId('fare')).toHaveText('₱45');
  await page.getByTestId('end').click();
  await page.locator('ion-alert button', { hasText: 'End trip' }).click();
  await expect(page.getByTestId('receipt-total')).toHaveText('₱45', { timeout: 20000 });
});

test('a trip with no distance cannot be saved', async ({ page }) => {
  await finishOnboarding(page, 'commuter');
  const t = Date.now();
  await pushFix(page, ROUTE[0], t);
  await page.getByTestId('start').click();
  await pushFix(page, ROUTE[0], t + 1000);

  await page.getByTestId('end').click();
  await expect(page.locator('ion-alert')).toContainText('No distance recorded');
  await page.locator('ion-alert button', { hasText: 'Discard trip' }).click();

  await expect(page.getByTestId('trip-status')).toHaveText(/Ready/);
  await page.goto('/tabs/history');
  await expect(page.getByTestId('empty-history')).toBeVisible();
});

test('students pay the discounted fare', async ({ page }) => {
  await finishOnboarding(page, 'commuter', 'Student');
  await expect(page.getByTestId('fare')).toHaveText('₱28');
});

test('jitter while standing still does not add distance', async ({ page }) => {
  await finishOnboarding(page, 'commuter');
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

test('fare info: official guideline data, city hotline, penalties and a working calculator', async ({ page }) => {
  await finishOnboarding(page, 'commuter');
  await page.goto('/tabs/fare-info');

  await expect(page.getByTestId('matrix-status')).toHaveText(/Confirmed/);
  await expect(page.getByTestId('effective-date')).toHaveText(/April 14, 2026/);
  await expect(page.getByTestId('per-passenger')).toContainText('at most 3 passengers');
  await expect(page.getByTestId('hotline')).toContainText('0998-500-2726');
  await expect(page.getByTestId('penalties').locator('li')).toHaveCount(3);

  await page.locator('[data-testid=calc-km] input').fill('4.56');
  await page.locator('app-fare-calculator ion-segment-button', { hasText: 'Student' }).click();
  await expect(page.getByTestId('calc-total')).toHaveText('₱38');
});
