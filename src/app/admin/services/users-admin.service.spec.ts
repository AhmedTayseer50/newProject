import { TestBed } from '@angular/core/testing';

import { UsersAdminService } from './users-admin.service';
import { createServiceProviders, serviceTestImports } from 'src/app/testing/spec-helpers';

describe('UsersAdminService', () => {
  let service: UsersAdminService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [...serviceTestImports],
      providers: [...createServiceProviders(), UsersAdminService],
    });
    service = TestBed.inject(UsersAdminService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

