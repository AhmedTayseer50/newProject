import { TestBed } from '@angular/core/testing';

import { TokenService } from './token.service';
import { createServiceProviders, serviceTestImports } from 'src/app/testing/spec-helpers';

describe('TokenService', () => {
  let service: TokenService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [...serviceTestImports],
      providers: [...createServiceProviders(), TokenService],
    });
    service = TestBed.inject(TokenService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

