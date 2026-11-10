import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { ConnectivityService } from '../../services/connectivity';

import { MAX_ZOOM, MIN_ZOOM, TripMapComponent } from './trip-map.component';

describe('TripMapComponent', () => {
  let component: TripMapComponent;
  let fixture: ComponentFixture<TripMapComponent>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TripMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('explains a map without tiles, offline or online', () => {
    const internal = component as unknown as { tilesFailed: { set(v: boolean): void } };
    const online = TestBed.inject(ConnectivityService).online;
    expect(component.tileNotice()).toBeNull();

    internal.tilesFailed.set(true);
    online.set(false);
    expect(component.tileNotice()?.title).toBe('Map needs internet');
    online.set(true);
    expect(component.tileNotice()?.title).toBe('Map could not load');
  });

  it('limits zoom to street level and the city region', () => {
    expect(MAX_ZOOM).toBe(19);
    expect(MIN_ZOOM).toBeGreaterThanOrEqual(10);
  });
});
