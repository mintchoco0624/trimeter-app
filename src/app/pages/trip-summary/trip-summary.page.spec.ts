import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { testProviders } from '../../../testing/test-providers';

import { TripSummaryPage } from './trip-summary.page';

describe('TripSummaryPage', () => {
  let component: TripSummaryPage;
  let fixture: ComponentFixture<TripSummaryPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: testProviders });
    fixture = TestBed.createComponent(TripSummaryPage);
    fixture.componentRef.setInput('id', 'missing-trip');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
