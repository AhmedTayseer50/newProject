import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';
import { createServiceProviders, serviceTestImports } from 'src/app/testing/spec-helpers';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [...serviceTestImports],
      providers: [...createServiceProviders(), AuthService],
    });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

