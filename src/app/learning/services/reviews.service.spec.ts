import { TestBed } from '@angular/core/testing';

import { ReviewsService } from './reviews.service';
import { createServiceProviders, serviceTestImports } from 'src/app/testing/spec-helpers';

describe('ReviewsService', () => {
  let service: ReviewsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [...serviceTestImports],
      providers: [...createServiceProviders(), ReviewsService],
    });
    service = TestBed.inject(ReviewsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

