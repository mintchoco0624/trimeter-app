import { TestBed } from '@angular/core/testing';

import { testProviders } from '../../testing/test-providers';

import { SettingsService } from './settings';

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: testProviders });
    service = TestBed.inject(SettingsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
