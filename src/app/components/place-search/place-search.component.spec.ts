import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { testProviders } from '../../../testing/test-providers';
import { ConnectivityService } from '../../services/connectivity';
import { GeocodeService } from '../../services/geocode';

import { PlaceSearchComponent } from './place-search.component';

describe('PlaceSearchComponent', () => {
  let component: PlaceSearchComponent;
  let fixture: ComponentFixture<PlaceSearchComponent>;
  let geocode: GeocodeService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: testProviders });
    fixture = TestBed.createComponent(PlaceSearchComponent);
    component = fixture.componentInstance;
    geocode = TestBed.inject(GeocodeService);
    TestBed.inject(ConnectivityService).online.set(true);
    fixture.detectChanges();
  });

  it('does not search for fewer than 3 letters', async () => {
    const spy = vi.spyOn(geocode, 'search');
    await component.search('sm');
    expect(spy).not.toHaveBeenCalled();
    expect(component.results()).toEqual([]);
  });

  it('shows results and emits the picked place', async () => {
    const place = { lat: 15.47, lng: 120.95, label: 'SM City Cabanatuan' };
    vi.spyOn(geocode, 'search').mockResolvedValue([place]);
    const picked: unknown[] = [];
    component.picked.subscribe((p) => picked.push(p));

    await component.search('SM City');
    expect(component.results()).toEqual([place]);

    component.pick(place);
    expect(picked).toEqual([place]);
    expect(component.results()).toEqual([]);
  });

  it('explains when nothing is found', async () => {
    vi.spyOn(geocode, 'search').mockResolvedValue([]);
    await component.search('Atlantis');
    expect(component.message()).toContain('No places named “Atlantis”');
  });

  it('explains when the phone is offline, without calling the server', async () => {
    TestBed.inject(ConnectivityService).online.set(false);
    const spy = vi.spyOn(geocode, 'search');
    await component.search('NEUST');
    expect(spy).not.toHaveBeenCalled();
    expect(component.message()).toContain('offline');
  });

  it('explains when the search request fails', async () => {
    vi.spyOn(geocode, 'search').mockRejectedValue(new Error('timeout'));
    await component.search('NEUST');
    expect(component.message()).toContain('not available');
  });
});
