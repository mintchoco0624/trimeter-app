import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';

/** Providers every page/service test needs: router, a fake HttpClient backend and Ionic. */
export const testProviders = [
  provideRouter([]),
  provideHttpClient(),
  provideHttpClientTesting(),
  provideIonicAngular(),
];
