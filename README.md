# TriMeter

A GPS-based tricycle fare meter for Cabanatuan City. BSIT-3A, Mobile Application Technology final case study.

TriMeter measures the real distance of a tricycle ride with the phone's GPS and computes the fare from the city fare matrix, live, while you ride. After the trip it shows a receipt with a fare breakdown and an overcharge check.

**Group:** John Mathew Ramoso · Neo Arwen De Guzman · Charles Benedict Leodones

## Features

| Feature | Where in the code |
|---|---|
| Onboarding and passenger type (Regular, Student, Senior, PWD) | `src/app/pages/onboarding/onboarding.page.ts` |
| Live GPS fare meter (automatic mode) with Leaflet map, haptics | `src/app/pages/meter/meter.page.ts`, `src/app/services/location.ts` |
| Manual estimate (backup mode): search or tap A and B, OSRM road distance | `src/app/pages/estimate/estimate.page.ts`, `src/app/services/routing.ts` |
| Trip receipt: fare breakdown, overcharge check, share | `src/app/pages/trip-summary/trip-summary.page.ts` |
| Trip history: view, swipe to delete, totals | `src/app/pages/history/history.page.ts`, `src/app/services/trip-storage.ts` |
| Fare info: fare matrix, gas price band, example fares, FAQ | `src/app/pages/fare-info/fare-info.page.ts`, `src/app/services/fare-matrix.ts` |
| Fare computation | `src/app/services/fare.ts` |

## Mobile capabilities and data handling

- **Geolocation** (`@capacitor/geolocation`): `watchPosition` with high accuracy. Every fix passes `judgeFix()`, which drops inaccurate fixes (over 35 m), jitter (under 5 m) and impossible jumps (over 30 m/s).
- **Haptics** (`@capacitor/haptics`): a light tap each time the fare goes up, and stronger taps when a trip starts or ends.
- **Share** (`@capacitor/share`): shares the trip receipt as text.
- **Local data** (`@capacitor/preferences`): trip history is saved on the phone (create, read, update, delete), along with the settings.
- **HttpClient GET** (Angular): loads the fare matrix JSON, falling back to a saved copy and then a bundled copy. Also calls OpenStreetMap Nominatim for place names and OSRM for road distance.

No accounts, passwords or API keys are used. All endpoints are public and key-free (see `src/environments/environment.ts`).

## Fare data

`src/assets/fare-matrix.json` uses the figures for **City Ordinance No. 050-2026** as compiled by the community [BetterCabanatuan fare project](https://github.com/BetterCabanatuan/bettercabanatuan-fare):

- First 3 km: ₱35 regular, ₱28 discounted
- Each succeeding km: +₱5 regular, +₱4 discounted
- Part of a km counts as a full km
- Gasoline-price bands raise the fare in steps

These figures are **not yet verified** with the city, and the app labels them "Unconfirmed". To update the fare without a new APK, push this repo to GitHub and set `fareMatrixUrl` in `src/environments/environment*.ts` to the raw URL of `src/assets/fare-matrix.json`.

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
npm run test:unit      # 41 unit tests (Vitest): fare rules, GPS filter, pipes, guard
npx ng serve --port 4200 &   # then, in another terminal:
npm run test:e2e       # 4 Playwright tests: a full 4.56 km GPS trip replayed in Chrome
npm run lint
```

## Build the Android APK

1. Install Android Studio (it includes the Android SDK and JDK 21).
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
  pages/        onboarding, tabs, meter, estimate, trip-summary, history, fare-info   (ionic g page)
  components/   trip-map (Leaflet)                                                   (ionic g component)
  services/     location, fare, fare-matrix, trip-storage, geocode, routing,
                settings, feedback                                                   (ionic g service)
  guards/       onboarding-guard                                                     (ionic g guard)
  pipes/        peso, duration                                                       (ionic g pipe)
  models/       trip, fare-matrix                                                    (ionic g interface)
e2e/            Playwright tests with a replayed GPS route
android/        Capacitor Android project
```

## Known limitations

- Phone GPS can drift near tall buildings or in bad weather.
- The app must stay open during a trip, because Android can pause tracking in the background. The screen is kept awake with the Wake Lock API.
- The fare matrix is unconfirmed (see Fare data).

## AI assistance

Claude Code (Anthropic) helped scaffold the project with the Ionic CLI, write and refactor code and tests, and produce the presentation video. The group reviewed and tested the code.
