import { TestBed } from '@angular/core/testing';

import { HttpErrorService } from './http-error.service';
import { createServiceProviders, serviceTestImports } from 'src/app/testing/spec-helpers';

describe('HttpErrorService', () => {
  let service: HttpErrorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [...serviceTestImports],
      providers: [...createServiceProviders(), HttpErrorService],
    });
    service = TestBed.inject(HttpErrorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

