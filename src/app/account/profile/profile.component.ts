import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Auth, User } from '@angular/fire/auth';
import { Observable } from 'rxjs';

interface AccountShortcut {
  title: string;
  description: string;
  route: string;
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  private auth = inject(Auth);

  user$: Observable<User | null> = new Observable<User | null>((subscriber) => {
    const unsubscribe = this.auth.onAuthStateChanged(
      (user) => subscriber.next(user),
      (error) => subscriber.error(error),
      () => subscriber.complete(),
    );

    return () => unsubscribe();
  });

  get isEnglish(): boolean {
    return window.location.pathname.startsWith('/en');
  }

  get pageDir(): 'rtl' | 'ltr' {
    return this.isEnglish ? 'ltr' : 'rtl';
  }

  get shortcuts(): AccountShortcut[] {
    return this.isEnglish
      ? [
          {
            title: 'Settings',
            description: 'Update your profile details, language preference, and notification settings.',
            route: '/settings',
          },
          {
            title: 'Billing',
            description: 'Review paid orders, payment status, and the latest billing records.',
            route: '/subscription',
          },
          {
            title: 'Certificates',
            description: 'Track issued certificates and course records linked to your account.',
            route: '/certificates',
          },
          {
            title: 'Course reviews',
            description: 'Save and edit your private review drafts for the courses you own.',
            route: '/course-reviews',
          },
        ]
      : [
          {
            title: 'الإعدادات',
            description: 'حدّث بيانات الحساب وتفضيلات اللغة ووضع العرض وإشعارات التواصل.',
            route: '/settings',
          },
          {
            title: 'الفوترة',
            description: 'راجع الطلبات المدفوعة وحالة الدفع وآخر السجلات المرتبطة بمشترياتك.',
            route: '/subscription',
          },
          {
            title: 'الشهادات',
            description: 'تابع الشهادات الصادرة وسجل الكورسات المرتبط بحسابك التعليمي.',
            route: '/certificates',
          },
          {
            title: 'تقييمات الكورسات',
            description: 'احفظ وحرر تقييماتك الخاصة للكورسات التي تمتلكها من داخل الحساب.',
            route: '/course-reviews',
          },
        ];
  }
}
