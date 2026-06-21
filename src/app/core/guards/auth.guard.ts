import { Injectable, inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Observable, map, take } from 'rxjs';

import { AuthService } from 'src/app/auth/services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  private auth = inject(AuthService);
  private router = inject(Router);

  canActivate(
    _route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Observable<boolean | UrlTree> {
    return this.auth.user$.pipe(
      take(1),
      map((user) => {
        if (!user) {
          return this.router.createUrlTree(['/login'], {
            queryParams: {
              redirect: state.url || '/courses',
            },
          });
        }

        if (this.auth.needsEmailVerification(user)) {
          return this.router.createUrlTree(['/verify-email'], {
            queryParams: {
              email: user.email || '',
              redirect: state.url || '/courses',
            },
          });
        }

        return true;
      }),
    );
  }
}
