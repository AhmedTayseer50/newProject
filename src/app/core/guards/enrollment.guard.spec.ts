import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { Database } from '@angular/fire/database';

import { EnrollmentGuard } from './enrollment.guard';

describe('EnrollmentGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        EnrollmentGuard,
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['parseUrl', 'createUrlTree']) },
        { provide: Auth, useValue: { currentUser: null } },
        { provide: Database, useValue: {} },
      ],
    });
  });

  it('should be created', () => {
    expect(TestBed.inject(EnrollmentGuard)).toBeTruthy();
  });
});
