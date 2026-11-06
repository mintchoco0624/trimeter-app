import { HttpClient } from '@angular/common/http';
import { Service, inject, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { timeout } from 'rxjs';

import { environment } from '../../environments/environment';
import type { FareMatrix } from '../models/fare-matrix';

const CACHE_KEY = 'trimeter.fareMatrix';

/** Where the matrix currently on screen came from. */
export type MatrixSource = 'remote' | 'cache' | 'bundled';

/**
 * Loads the LGU fare matrix with HttpClient (GET).
 *
 * Order: 1) last saved copy (instant, works offline)  2) the online copy, so fare changes
 * reach users without a new APK  3) the copy bundled inside the app as the last resort.
 */
@Service()
export class FareMatrixService {
  private http = inject(HttpClient);

  readonly matrix = signal<FareMatrix | null>(null);
  readonly source = signal<MatrixSource | null>(null);
  readonly loading = signal(false);
  readonly message = signal('');

  async init(): Promise<void> {
    const { value } = await Preferences.get({ key: CACHE_KEY });
    if (value) {
      this.matrix.set(JSON.parse(value) as FareMatrix);
      this.source.set('cache');
    }
    this.refresh();
  }

  /** GET the newest matrix. Falls back to the bundled file when offline or not configured. */
  refresh(): void {
    const url = environment.fareMatrixUrl || environment.bundledFareMatrixUrl;
    const source: MatrixSource = environment.fareMatrixUrl ? 'remote' : 'bundled';
    this.loading.set(true);

    this.http
      .get<FareMatrix>(url)
      .pipe(timeout(10000))
      .subscribe({
        next: (res) => {
          this.apply(res, source);
          this.message.set(`Fare matrix ${res.version} loaded.`);
        },
        error: (err) => {
          console.error('Fare matrix GET error:', err);
          this.message.set('Could not reach the online fare matrix. Using the saved copy.');
          if (!this.matrix()) this.loadBundled();
          else this.loading.set(false);
        },
      });
  }

  private loadBundled(): void {
    this.http.get<FareMatrix>(environment.bundledFareMatrixUrl).subscribe({
      next: (res) => this.apply(res, 'bundled'),
      error: (err) => {
        console.error('Bundled fare matrix error:', err);
        this.loading.set(false);
      },
    });
  }

  private apply(matrix: FareMatrix, source: MatrixSource): void {
    this.matrix.set(matrix);
    this.source.set(source);
    this.loading.set(false);
    void Preferences.set({ key: CACHE_KEY, value: JSON.stringify(matrix) });
  }
}
