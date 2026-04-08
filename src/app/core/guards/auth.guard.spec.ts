import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { AuthGuard } from './auth.guard';
import { AuthService } from 'src/app/auth/services/auth.service';

describe('AuthGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['createUrlTree']) },
        { provide: AuthService, useValue: { isLoggedIn$: of(true) } },
      ],
    });
  });

  it('should be created', () => {
    expect(TestBed.inject(AuthGuard)).toBeTruthy();
  });
});
