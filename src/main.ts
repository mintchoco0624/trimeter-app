import { provideHttpClient } from '@angular/common/http';
import { inject, provideAppInitializer } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import {
  RouteReuseStrategy,
  provideRouter,
  withComponentInputBinding,
  withPreloading,
  PreloadAllModules,
} from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { FareMatrixService } from './app/services/fare-matrix';
import { SettingsService } from './app/services/settings';
import { TripStorageService } from './app/services/trip-storage';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules), withComponentInputBinding()),
    provideHttpClient(), // needed for every HttpClient GET in the services
    // Load saved settings, trip history and the fare matrix before the first screen shows.
    provideAppInitializer(() =>
      Promise.all([
        inject(SettingsService).load(),
        inject(TripStorageService).load(),
        inject(FareMatrixService).init(),
      ]),
    ),
  ],
});
