import { TestBed } from '@angular/core/testing';

import { testProviders } from '../../testing/test-providers';

import { FeedbackService } from './feedback';

describe('FeedbackService', () => {
  let service: FeedbackService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: testProviders });
    service = TestBed.inject(FeedbackService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
