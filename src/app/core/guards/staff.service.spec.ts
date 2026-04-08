import { TestBed } from '@angular/core/testing';

import { StaffService } from './staff.service';
import { createServiceProviders, serviceTestImports } from 'src/app/testing/spec-helpers';

describe('StaffService', () => {
  let service: StaffService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [...serviceTestImports],
      providers: [...createServiceProviders(), StaffService],
    });
    service = TestBed.inject(StaffService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

