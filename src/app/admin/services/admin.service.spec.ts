import { TestBed } from '@angular/core/testing';

import { AdminService } from './admin.service';
import { createServiceProviders, serviceTestImports } from 'src/app/testing/spec-helpers';

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [...serviceTestImports],
      providers: [...createServiceProviders(), AdminService],
    });
    service = TestBed.inject(AdminService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

