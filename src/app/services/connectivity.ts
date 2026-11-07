import { Service, signal } from '@angular/core';

/**
 * Online / offline status from the browser (the Android WebView reports it too), so screens can
 * explain why maps, place search or road distance are not working. No extra plugin needed.
 */
@Service()
export class ConnectivityService {
  readonly online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);

  constructor() {
    if (typeof window === 'undefined') return;
    window.addEventListener('online', () => this.online.set(true));
    window.addEventListener('offline', () => this.online.set(false));
  }
}
