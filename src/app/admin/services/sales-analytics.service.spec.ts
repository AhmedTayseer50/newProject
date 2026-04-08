import { TestBed } from '@angular/core/testing';

import { SalesAnalyticsService } from './sales-analytics.service';
import { createServiceProviders, serviceTestImports } from 'src/app/testing/spec-helpers';

describe('SalesAnalyticsService', () => {
  let service: SalesAnalyticsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [...serviceTestImports],
      providers: [...createServiceProviders(), SalesAnalyticsService],
    });
    service = TestBed.inject(SalesAnalyticsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

