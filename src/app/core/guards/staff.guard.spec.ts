import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';

import { StaffGuard } from './staff.guard';
import { UserService } from '../services/user.service';

describe('StaffGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        StaffGuard,
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['createUrlTree']) },
        { provide: Auth, useValue: { currentUser: null } },
        { provide: UserService, useValue: jasmine.createSpyObj('UserService', ['isAdmin', 'isStaff']) },
      ],
    });
  });

  it('should be created', () => {
    expect(TestBed.inject(StaffGuard)).toBeTruthy();
  });
});
