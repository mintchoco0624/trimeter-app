import type { Routes } from '@angular/router';

import { onboardingGuard } from './guards/onboarding-guard';

export const routes: Routes = [
  {
    path: 'onboarding',
    loadComponent: () => import('./pages/onboarding/onboarding.page').then((m) => m.OnboardingPage),
  },
  {
    path: 'tabs',
    canActivate: [onboardingGuard],
    loadComponent: () => import('./pages/tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      {
        path: 'meter',
        loadComponent: () => import('./pages/meter/meter.page').then((m) => m.MeterPage),
      },
      {
        path: 'history',
        loadComponent: () => import('./pages/history/history.page').then((m) => m.HistoryPage),
      },
      {
        path: 'fare-info',
        loadComponent: () => import('./pages/fare-info/fare-info.page').then((m) => m.FareInfoPage),
      },
      { path: '', redirectTo: '/tabs/meter', pathMatch: 'full' },
    ],
  },
  {
    path: 'estimate',
    canActivate: [onboardingGuard],
    loadComponent: () => import('./pages/estimate/estimate.page').then((m) => m.EstimatePage),
  },
  {
    path: 'trip/:id',
    canActivate: [onboardingGuard],
    loadComponent: () => import('./pages/trip-summary/trip-summary.page').then((m) => m.TripSummaryPage),
  },
  { path: '', redirectTo: '/tabs/meter', pathMatch: 'full' },
  { path: '**', redirectTo: '/tabs/meter' },
];
