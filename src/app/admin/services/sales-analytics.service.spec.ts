import { TestBed } from '@angular/core/testing';

import { SalesAnalyticsService } from './sales-analytics.service';

describe('SalesAnalyticsService', () => {
  let service: SalesAnalyticsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SalesAnalyticsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
