import { TestBed } from '@angular/core/testing';

import { CasesService } from './cases.service';
import { createServiceProviders, serviceTestImports } from 'src/app/testing/spec-helpers';

describe('CasesService', () => {
  let service: CasesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [...serviceTestImports],
      providers: [...createServiceProviders(), CasesService],
    });
    service = TestBed.inject(CasesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

