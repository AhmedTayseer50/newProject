import { TestBed } from '@angular/core/testing';

import { ProfileService } from './profile.service';
import { createServiceProviders, serviceTestImports } from 'src/app/testing/spec-helpers';

describe('ProfileService', () => {
  let service: ProfileService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [...serviceTestImports],
      providers: [...createServiceProviders(), ProfileService],
    });
    service = TestBed.inject(ProfileService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

