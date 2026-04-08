import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';

import { AdminGuard } from './admin.guard';
import { UserService } from '../services/user.service';

describe('AdminGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AdminGuard,
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['createUrlTree']) },
        { provide: Auth, useValue: { currentUser: null } },
        { provide: UserService, useValue: jasmine.createSpyObj('UserService', ['isAdmin']) },
      ],
    });
  });

  it('should be created', () => {
    expect(TestBed.inject(AdminGuard)).toBeTruthy();
  });
});
