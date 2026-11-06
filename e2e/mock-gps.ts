import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';


/**
 * Replaces navigator.geolocation with a fake we can drive from the test,
 * so a whole tricycle trip can be "ridden" in a few seconds.
 */
export const MOCK_GEOLOCATION = `(() => {
  const watchers = new Map(); let id = 0; let last = null;
  window.__geo = { push(lat, lng, acc, t) {
    last = { coords: { latitude: lat, longitude: lng, accuracy: acc, altitude: null, altitudeAccuracy: null, heading: null, speed: null }, timestamp: t };
    watchers.forEach((cb) => cb(last));
  } };
  const geo = {
    getCurrentPosition(ok, err) { setTimeout(() => (last ? ok(last) : err && err({ code: 2, message: 'no fix' })), 200); },
    watchPosition(ok) { const i = ++id; watchers.set(i, ok); if (last) setTimeout(() => ok(last), 100); return i; },
    clearWatch(i) { watchers.delete(i); },
  };
  Object.defineProperty(navigator, 'geolocation', { value: geo, configurable: true });
})();`;

type LngLat = [number, number];

/** Real road route from NE Pacific Mall to NEUST (General Tinio St), 4.56 km, from OSRM. */
export function loadRoute(): LngLat[] {
  const json = JSON.parse(readFileSync(join(__dirname, 'route-nepacific-neust.json'), 'utf8'));
  return json.routes[0].geometry.coordinates as LngLat[];
}

/** Splits the route into points about `stepM` metres apart, like GPS fixes from a moving tricycle. */
export function densify(coords: LngLat[], stepM: number): LngLat[] {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dist = (a: LngLat, b: LngLat) => {
    const dLat = rad(b[1] - a[1]);
    const dLng = rad(b[0] - a[0]);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2;
    return 2 * 6371000 * Math.asin(Math.sqrt(h));
  };
  const out: LngLat[] = [coords[0]];
  for (let i = 1; i < coords.length; i++) {
    const a = coords[i - 1];
    const b = coords[i];
    const n = Math.max(1, Math.round(dist(a, b) / stepM));
    for (let k = 1; k <= n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  return out;
}

/** Sends one GPS fix to the app. `t` is the fix time in ms. */
export async function pushFix(page: Page, [lng, lat]: LngLat, t: number, acc = 6): Promise<void> {
  await page.evaluate(
    ([la, ln, a, tt]) => (window as unknown as { __geo: { push: (...x: number[]) => void } }).__geo.push(la, ln, a, tt),
    [lat, lng, acc, t],
  );
}
