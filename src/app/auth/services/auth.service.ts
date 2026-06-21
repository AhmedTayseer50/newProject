import { Injectable, inject } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  UserCredential,
  User,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
  reload,
} from '@angular/fire/auth';
import { Observable, map } from 'rxjs';
import { UserService } from 'src/app/core/services/user.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private userSvc = inject(UserService);

  private observeAuthUser(): Observable<User | null> {
    return new Observable<User | null>((subscriber) => {
      const unsubscribe = this.auth.onAuthStateChanged(
        (user) => subscriber.next(user),
        (error) => subscriber.error(error),
        () => subscriber.complete(),
      );

      return () => unsubscribe();
    });
  }

  /** تدفق حالة المستخدم (null لو مفيش تسجيل) */
  user$: Observable<User | null> = this.observeAuthUser();

  /** هل المستخدم مسجّل دخول؟ */
  isLoggedIn$: Observable<boolean> = this.user$.pipe(map((u) => !!u));

  /** إنشاء حساب جديد + إرسال رابط تفعيل الإيميل للحسابات العادية */
  async signup(
    email: string,
    password: string,
    extra?: { displayName?: string; whatsapp?: string },
  ): Promise<UserCredential> {
    const cred = await createUserWithEmailAndPassword(
      this.auth,
      email,
      password,
    );

    if (extra?.displayName) {
      const { updateProfile } = await import('@angular/fire/auth');
      await updateProfile(cred.user, { displayName: extra.displayName });
    }

    await this.userSvc.syncUser(cred.user, {
      displayName: extra?.displayName,
      whatsapp: extra?.whatsapp,
    });

    await this.sendVerificationEmail(cred.user);
    return cred;
  }

  /** تسجيل دخول + مزامنة بياناته في Realtime DB */
  async login(email: string, password: string): Promise<UserCredential> {
    const cred = await signInWithEmailAndPassword(this.auth, email, password);
    await this.userSvc.syncUser(cred.user);
    return cred;
  }

  /** ✅ تسجيل دخول عبر Google كما هو بدون فرض تفعيل إضافي */
  async loginWithGoogle(): Promise<UserCredential> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    const cred = await signInWithPopup(this.auth, provider);
    await this.userSvc.syncUser(cred.user);
    return cred;
  }

  isPasswordUser(user: User | null | undefined): boolean {
    return !!user?.providerData?.some((provider) => provider.providerId === 'password');
  }

  needsEmailVerification(user: User | null | undefined): boolean {
    return !!user && this.isPasswordUser(user) && user.emailVerified !== true;
  }

  async sendVerificationEmail(user?: User | null): Promise<void> {
    const targetUser = user ?? this.auth.currentUser;
    if (!targetUser || !this.needsEmailVerification(targetUser)) return;

    await sendEmailVerification(targetUser, {
      url: this.buildVerificationContinueUrl(),
      handleCodeInApp: false,
    });
  }

  async reloadCurrentUser(): Promise<User | null> {
    const user = this.auth.currentUser;
    if (!user) return null;

    await reload(user);
    return this.auth.currentUser;
  }

  /** تسجيل خروج */
  logout() {
    return signOut(this.auth);
  }

  /** نسيان كلمة المرور */
  resetPassword(email: string) {
    return sendPasswordResetEmail(this.auth, email);
  }

  private buildVerificationContinueUrl(): string {
    const origin = window.location.origin;
    const path = window.location.pathname;
    const langPrefix = path.startsWith('/en') ? '/en' : path.startsWith('/ar') ? '/ar' : '';

    return `${origin}${langPrefix}/verify-email`;
  }
}
