import { TestBed } from '@angular/core/testing';

import { EnrollmentsService } from './enrollments.service';
import { createServiceProviders, serviceTestImports } from 'src/app/testing/spec-helpers';

describe('EnrollmentsService', () => {
  let service: EnrollmentsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [...serviceTestImports],
      providers: [...createServiceProviders(), EnrollmentsService],
    });
    service = TestBed.inject(EnrollmentsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

