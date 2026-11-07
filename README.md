# TriMeter

A GPS-based tricycle fare meter for Cabanatuan City. BSIT-4C, Mobile Application Technology final case study.

TriMeter measures the real distance of a tricycle ride with the phone's GPS and computes the fare from the city fare matrix, live, while you ride. After the trip it shows a receipt with a fare breakdown and an overcharge check.

**Group:** John Mathew Ramoso · Neo Arwen De Guzman · Charles Benedict Leodones

## Features

| Feature | Where in the code |
|---|---|
| Onboarding with role selection (commuter / tricycle driver) and passenger type (Regular, Student, Senior, PWD) | `src/app/pages/onboarding/onboarding.page.ts`, `src/app/services/settings.ts` |
| Live GPS fare meter: Leaflet map, GPS signal and offline indicators, trip status, haptics | `src/app/pages/meter/meter.page.ts`, `src/app/services/location.ts` |
| Commuter: “Where to?” search with road distance and fare preview before the ride | `src/app/components/place-search/`, `src/app/services/routing.ts` |
| Driver: passenger type chosen per trip; History becomes “Trips” records | `src/app/pages/meter/meter.page.ts`, `src/app/pages/tabs/tabs.page.ts` |
| Trip rules: confirm before ending, no saving under 50 m, double-tap protection, save retry, Manual mode fallback when GPS fails | `src/app/pages/meter/meter.page.ts` |
| Manual estimate (backup mode): search or tap A and B, OSRM road distance | `src/app/pages/estimate/estimate.page.ts` |
| Trip receipt: regular fare, discount and final fare, overcharge check (commuters), share | `src/app/pages/trip-summary/`, `src/app/components/fare-breakdown/` |
| History: search by place, date filter, sorting, totals, swipe to delete | `src/app/pages/history/`, `src/app/services/trip-query.ts` |
| Fare info: fare matrix (ordinance no., effective date, source, status), fare calculator, examples, 8 FAQs, complaint steps | `src/app/pages/fare-info/`, `src/app/components/fare-calculator/` |
| Account: local profile, role switch, discount and privacy information, log out | `src/app/pages/account/account.page.ts` |
| Fare computation | `src/app/services/fare.ts` |

## Mobile capabilities and data handling

- **Geolocation** (`@capacitor/geolocation`): `watchPosition` with high accuracy. Every fix passes `judgeFix()`, which drops inaccurate fixes (over 35 m), jitter (under 5 m) and impossible jumps (over 30 m/s).
- **Haptics** (`@capacitor/haptics`): a light tap each time the fare goes up, and stronger taps when a trip starts or ends.
- **Share** (`@capacitor/share`): shares the trip receipt as text.
- **Local data** (`@capacitor/preferences`): trip history is saved on the phone (create, read, update, delete), along with the settings.
- **HttpClient GET** (Angular): loads the fare matrix JSON, falling back to a saved copy and then a bundled copy. Also calls OpenStreetMap Nominatim for place names and OSRM for road distance.

There is no server account: the profile and role are stored only on the phone, and “Log out” clears them. No passwords or API keys are used. All endpoints are public and key-free (see `src/environments/environment.ts`).

## Fare data

`src/assets/fare-matrix.json` uses the figures for **City Ordinance No. 050-2026** as compiled by the community [BetterCabanatuan fare project](https://github.com/BetterCabanatuan/bettercabanatuan-fare):

- First 3 km: ₱35 regular, ₱28 discounted
- Each succeeding km: +₱5 regular, +₱4 discounted
- Part of a km counts as a full km
- Gasoline-price bands raise the fare in steps

These figures are **not yet verified** with the city, and the app labels them "Unconfirmed". A [Rappler fact check](https://www.rappler.com/newsbreak/fact-check/new-cabanatuan-city-fare-matrix-ordinance-draft-not-yet-in-force/) (April 2026) reported that the matrix was still a draft and that the last official adjustment was in November 2018, so the effective date is shown as "Not confirmed" (`effectiveDate: null`). No complaint hotline is listed until an official number is verified (`hotline: ""`). The app downloads this file from GitHub on start (`fareMatrixUrl` in `src/environments/environment*.ts`), so editing `src/assets/fare-matrix.json` on the `main` branch updates the fare in every installed app without a new APK. Offline, it uses the last saved copy, then the copy bundled in the APK.

## Setup (development)

Requirements: Node.js 22.22+ or 24.15+ (Angular 22), Ionic CLI 7, and Android Studio for the APK.

```bash
npm install -g @ionic/cli
npm install
ionic serve            # opens http://localhost:8100
```

In the browser, allow location access. Chrome DevTools > More tools > Sensors can simulate a GPS position.

### Tests

```bash
npm run test:unit      # 73 unit tests (Vitest): fare rules, receipt breakdown, GPS filter, history search, roles, pages
npx ng serve --port 4200 &   # then, in another terminal:
npm run test:e2e       # 8 Playwright tests: commuter and driver trips on a replayed 4.56 km GPS route, online services mocked
npm run lint
```

## Build the Android APK

1. Install Android Studio (it includes the Android SDK). The plugins need Java 21; Gradle downloads it automatically on the first build (see `android/settings.gradle`).
2. Build the web app and copy it into the Android project:
   ```bash
   ionic build
   npx cap sync android
   ```
3. Build the APK. Either open the project with `npx cap open android` and choose **Build > Build App Bundle(s) / APK(s) > Build APK(s)**, or run from a terminal:
   ```powershell
   $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
   cd android; .\gradlew assembleDebug
   ```
4. The APK is at `android/app/build/outputs/apk/debug/app-debug.apk`.

## Install and use (for testers)

1. Copy `TriMeter.apk` to an Android phone (Android 7.0 or newer) and open it. If asked, allow **Install unknown apps** for your file manager or browser.
2. Open TriMeter, go through the 3-step onboarding, and choose who is riding.
3. On **Meter**, tap **Start Trip** and allow location access ("While using the app"). Keep the app open during the ride.
4. Tap **End Trip** when you arrive to see the receipt. Type what the driver asked to check for overcharging.
5. For a fare before riding, tap the map button (Manual estimate) and pick A and B.

The internet is needed for the map tiles, place names and road distance. GPS distance and fare work without it.

## Project structure

```
src/app/
  pages/        onboarding, tabs, meter, estimate, trip-summary, history, fare-info, account   (ionic g page)
  components/   trip-map (Leaflet), fare-breakdown, place-search, fare-calculator            (ionic g component)
  services/     location, fare, fare-matrix, trip-storage, geocode, routing,
                settings, feedback, connectivity; trip-query (search/filter/sort) (ionic g service)
  guards/       onboarding-guard                                                     (ionic g guard)
  pipes/        peso, duration                                                       (ionic g pipe)
  models/       trip, fare-matrix, profile                                           (ionic g interface)
e2e/            Playwright tests with a replayed GPS route
android/        Capacitor Android project
```

## Known limitations

- Phone GPS can drift near tall buildings or in bad weather.
- The app must stay open during a trip, because Android can pause tracking in the background. The screen is kept awake with the Wake Lock API.
- The fare matrix is unconfirmed (see Fare data).
- Roles and the profile are local only: there is no real login or ID verification. Discounts rely on the driver checking a valid ID.

## AI assistance

Claude Code (Anthropic) helped scaffold the project with the Ionic CLI, write and refactor code and tests, and produce the presentation video. The group reviewed and tested the code.
