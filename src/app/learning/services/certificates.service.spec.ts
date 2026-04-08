import { TestBed } from '@angular/core/testing';

import { CertificatesService } from './certificates.service';
import { createServiceProviders, serviceTestImports } from 'src/app/testing/spec-helpers';

describe('CertificatesService', () => {
  let service: CertificatesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [...serviceTestImports],
      providers: [...createServiceProviders(), CertificatesService],
    });
    service = TestBed.inject(CertificatesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

