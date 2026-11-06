import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MeterPage } from './meter.page';

describe('MeterPage', () => {
  let component: MeterPage;
  let fixture: ComponentFixture<MeterPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MeterPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
