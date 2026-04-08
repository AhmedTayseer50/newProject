import { TestBed } from '@angular/core/testing';

import { TelegramJoinService } from './telegram-join.service';
import { createServiceProviders, serviceTestImports } from 'src/app/testing/spec-helpers';

describe('TelegramJoinService', () => {
  let service: TelegramJoinService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [...serviceTestImports],
      providers: [...createServiceProviders(), TelegramJoinService],
    });
    service = TestBed.inject(TelegramJoinService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

