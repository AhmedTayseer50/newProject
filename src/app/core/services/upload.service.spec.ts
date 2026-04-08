import { TestBed } from '@angular/core/testing';

import { UploadService } from './upload.service';
import { createServiceProviders, serviceTestImports } from 'src/app/testing/spec-helpers';

describe('UploadService', () => {
  let service: UploadService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [...serviceTestImports],
      providers: [...createServiceProviders(), UploadService],
    });
    service = TestBed.inject(UploadService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

