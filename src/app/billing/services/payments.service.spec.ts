import { TestBed } from '@angular/core/testing';

import { PaymentsService } from './payments.service';
import { createServiceProviders, serviceTestImports } from 'src/app/testing/spec-helpers';

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [...serviceTestImports],
      providers: [...createServiceProviders(), PaymentsService],
    });
    service = TestBed.inject(PaymentsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

