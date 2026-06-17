import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Auth, User, onAuthStateChanged } from '@angular/fire/auth';
import { UserService } from '../services/user.service';

function waitForAuthUser(auth: Auth): Promise<User | null> {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);

  return new Promise<User | null>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      unsubscribe();
      resolve(auth.currentUser);
    }, 5000);

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        clearTimeout(timeoutId);
        unsubscribe();
        resolve(user);
      },
      (error) => {
        clearTimeout(timeoutId);
        unsubscribe();
        reject(error);
      },
    );
  });
}

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  private router = inject(Router);
  private auth = inject(Auth);
  private userSvc = inject(UserService);

  async canActivate(): Promise<boolean | UrlTree> {
    const u = await waitForAuthUser(this.auth);
    if (!u) return this.router.createUrlTree(['/login'], { queryParams: { redirect: '/admin/dashboard' } });

    const ok = await this.userSvc.isAdmin(u.uid);
    return ok ? true : this.router.createUrlTree(['/']);
  }
}
