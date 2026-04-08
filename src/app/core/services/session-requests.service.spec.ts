import { TestBed } from '@angular/core/testing';

import { SessionRequestsService } from './session-requests.service';
import { createServiceProviders, serviceTestImports } from 'src/app/testing/spec-helpers';

describe('SessionRequestsService', () => {
  let service: SessionRequestsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [...serviceTestImports],
      providers: [...createServiceProviders(), SessionRequestsService],
    });
    service = TestBed.inject(SessionRequestsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

