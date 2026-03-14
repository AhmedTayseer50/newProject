import { TestBed } from '@angular/core/testing';

import { TelegramJoinService } from './telegram-join.service';

describe('TelegramJoinService', () => {
  let service: TelegramJoinService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TelegramJoinService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
