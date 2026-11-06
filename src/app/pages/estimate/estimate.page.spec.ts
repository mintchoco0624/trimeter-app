import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EstimatePage } from './estimate.page';

describe('EstimatePage', () => {
  let component: EstimatePage;
  let fixture: ComponentFixture<EstimatePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EstimatePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
