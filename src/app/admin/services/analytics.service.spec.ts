import { TestBed } from '@angular/core/testing';

import { AnalyticsService } from './analytics.service';
import { createServiceProviders, serviceTestImports } from 'src/app/testing/spec-helpers';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [...serviceTestImports],
      providers: [...createServiceProviders(), AnalyticsService],
    });
    service = TestBed.inject(AnalyticsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

