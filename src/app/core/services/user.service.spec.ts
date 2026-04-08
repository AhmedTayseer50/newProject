import { TestBed } from '@angular/core/testing';

import { UserService } from './user.service';
import { createServiceProviders, serviceTestImports } from 'src/app/testing/spec-helpers';

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [...serviceTestImports],
      providers: [...createServiceProviders(), UserService],
    });
    service = TestBed.inject(UserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

