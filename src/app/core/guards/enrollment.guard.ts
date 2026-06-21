import { Injectable, inject } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { Auth, User, onAuthStateChanged } from '@angular/fire/auth';
import { Database, ref, get } from '@angular/fire/database';

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


function needsEmailVerification(user: User): boolean {
  const isPasswordUser = user.providerData?.some(
    (provider) => provider.providerId === 'password',
  );

  return !!isPasswordUser && user.emailVerified !== true;
}

@Injectable({ providedIn: 'root' })
export class EnrollmentGuard implements CanActivate {
  private auth = inject(Auth);
  private db = inject(Database);
  private router = inject(Router);

  async canActivate(route: ActivatedRouteSnapshot): Promise<boolean | UrlTree> {
    const courseId = route.paramMap.get('courseId');
    const lessonId = route.paramMap.get('lessonId');

    if (!courseId) return this.router.parseUrl('/courses');

    // مهم بعد Refresh: Firebase Auth بيحتاج لحظة يسترجع المستخدم من التخزين المحلي.
    // لذلك لا نستخدم currentUser مباشرة قبل انتظار onAuthStateChanged.
    const me = await waitForAuthUser(this.auth);
    const redirectUrl = lessonId ? `/lesson/${courseId}/${lessonId}` : `/courses/${courseId}`;

    if (!me) {
      return this.router.createUrlTree(['/login'], {
        queryParams: { redirect: redirectUrl },
      });
    }

    const adminSnap = await get(ref(this.db, `users/${me.uid}/isAdmin`));
    if (adminSnap.exists() && adminSnap.val() === true) return true;

    if (needsEmailVerification(me)) {
      return this.router.createUrlTree(['/verify-email'], {
        queryParams: {
          email: me.email || '',
          redirect: redirectUrl,
        },
      });
    }

    const enrSnap = await get(ref(this.db, `enrollments/${me.uid}/${courseId}`));
    if (enrSnap.exists()) {
      const enrollment = enrSnap.val();

      if (enrollment === true) return true;

      if (enrollment?.status === 'suspended') {
        return this.router.createUrlTree(['/courses', courseId], {
          queryParams: { access: 'suspended' },
        });
      }

      if (enrollment?.expiresAt && Date.now() > Number(enrollment.expiresAt)) {
        return this.router.createUrlTree(['/courses', courseId], {
          queryParams: { access: 'expired' },
        });
      }

      return true;
    }

    return this.router.parseUrl(`/courses/${courseId}`);
  }
}
