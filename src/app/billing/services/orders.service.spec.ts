import { TestBed } from '@angular/core/testing';

import { OrdersService } from './orders.service';
import { createServiceProviders, serviceTestImports } from 'src/app/testing/spec-helpers';

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [...serviceTestImports],
      providers: [...createServiceProviders(), OrdersService],
    });
    service = TestBed.inject(OrdersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

