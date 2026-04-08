import { TestBed } from '@angular/core/testing';

import { SubscriptionService } from './subscription.service';
import { createServiceProviders, serviceTestImports } from 'src/app/testing/spec-helpers';

describe('SubscriptionService', () => {
  let service: SubscriptionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [...serviceTestImports],
      providers: [...createServiceProviders(), SubscriptionService],
    });
    service = TestBed.inject(SubscriptionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

