import { TestBed } from '@angular/core/testing';

import { WhatsAppService } from './whatsapp.service';
import { createServiceProviders, serviceTestImports } from 'src/app/testing/spec-helpers';

describe('WhatsAppService', () => {
  let service: WhatsAppService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [...serviceTestImports],
      providers: [...createServiceProviders(), WhatsAppService],
    });
    service = TestBed.inject(WhatsAppService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

