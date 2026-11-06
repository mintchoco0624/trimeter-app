import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TripSummaryPage } from './trip-summary.page';

describe('TripSummaryPage', () => {
  let component: TripSummaryPage;
  let fixture: ComponentFixture<TripSummaryPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TripSummaryPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
