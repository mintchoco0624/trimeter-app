import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { testProviders } from '../../../testing/test-providers';
import { FeedbackService } from '../../services/feedback';
import { SettingsService } from '../../services/settings';

import { AccountPage } from './account.page';

describe('AccountPage', () => {
  let component: AccountPage;
  let fixture: ComponentFixture<AccountPage>;
  let settings: SettingsService;
  let feedback: FeedbackService;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: testProviders });
    settings = TestBed.inject(SettingsService);
    feedback = TestBed.inject(FeedbackService);
    vi.spyOn(feedback, 'toast').mockResolvedValue();
    await settings.load();
    fixture = TestBed.createComponent(AccountPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows the role from settings', () => {
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Commuter');
  });

  it('switches role after confirmation', async () => {
    vi.spyOn(feedback, 'confirm').mockResolvedValue(true);
    await component.switchRole();
    expect(settings.role()).toBe('driver');
  });

  it('keeps the role when the user cancels', async () => {
    vi.spyOn(feedback, 'confirm').mockResolvedValue(false);
    await component.switchRole();
    expect(settings.role()).toBe('commuter');
  });

  it('logs out: clears the profile and returns to onboarding', async () => {
    await settings.setRole('driver');
    await settings.completeOnboarding();
    vi.spyOn(feedback, 'confirm').mockResolvedValue(true);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    await component.logout();

    expect(settings.onboarded()).toBe(false);
    expect(settings.role()).toBe('commuter');
    expect(navigate).toHaveBeenCalledWith('/onboarding', { replaceUrl: true });
  });
});
