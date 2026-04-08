import { TestBed } from '@angular/core/testing';

import { SettingsService } from './settings.service';
import { createServiceProviders, serviceTestImports } from 'src/app/testing/spec-helpers';

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [...serviceTestImports],
      providers: [...createServiceProviders(), SettingsService],
    });
    service = TestBed.inject(SettingsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

