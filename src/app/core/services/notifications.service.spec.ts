import { TestBed } from '@angular/core/testing';

import { NotificationsService } from './notifications.service';
import { createServiceProviders, serviceTestImports } from 'src/app/testing/spec-helpers';

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [...serviceTestImports],
      providers: [...createServiceProviders(), NotificationsService],
    });
    service = TestBed.inject(NotificationsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

