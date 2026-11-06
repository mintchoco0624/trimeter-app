import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'onboarding',
    loadComponent: () => import('./pages/onboarding/onboarding.page').then((m) => m.OnboardingPage),
  },
  {
    path: 'tabs',
    loadComponent: () => import('./pages/tabs/tabs.page').then((m) => m.TabsPage),
  },
  {
    path: 'meter',
    loadComponent: () => import('./pages/meter/meter.page').then((m) => m.MeterPage),
  },
  {
    path: 'estimate',
    loadComponent: () => import('./pages/estimate/estimate.page').then((m) => m.EstimatePage),
  },
  {
    path: 'trip-summary',
    loadComponent: () => import('./pages/trip-summary/trip-summary.page').then((m) => m.TripSummaryPage),
  },
  {
    path: 'history',
    loadComponent: () => import('./pages/history/history.page').then((m) => m.HistoryPage),
  },
  {
    path: 'fare-info',
    loadComponent: () => import('./pages/fare-info/fare-info.page').then((m) => m.FareInfoPage),
  },
];
