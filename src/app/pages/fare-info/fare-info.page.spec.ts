import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FareInfoPage } from './fare-info.page';

describe('FareInfoPage', () => {
  let component: FareInfoPage;
  let fixture: ComponentFixture<FareInfoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(FareInfoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
