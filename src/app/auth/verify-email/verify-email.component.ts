import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.css'],
})
export class VerifyEmailComponent implements OnInit {
  currentLang: 'ar' | 'en' = 'ar';
  email = '';
  redirectUrl = '/courses';
  loading = false;
  resendLoading = false;
  message = '';
  error = '';

  constructor(
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.currentLang = this.detectLangFromPath();
    this.email = this.route.snapshot.queryParamMap.get('email') || '';

    const redirect = this.route.snapshot.queryParamMap.get('redirect');
    if (redirect && redirect.startsWith('/')) {
      this.redirectUrl = redirect;
    }
  }

  get pageDir(): 'rtl' | 'ltr' {
    return this.currentLang === 'ar' ? 'rtl' : 'ltr';
  }

  get titleText(): string {
    return this.currentLang === 'en' ? 'Verify your email' : 'فعّل بريدك الإلكتروني';
  }

  get descriptionText(): string {
    return this.currentLang === 'en'
      ? 'We sent a verification link to your email. Open the message, click the link, then come back and press the confirmation button. If you cannot find it, check Spam, Junk, Promotions, or Updates folders.'
      : 'أرسلنا رابط تفعيل إلى بريدك الإلكتروني. افتح الرسالة واضغط رابط التفعيل، ثم ارجع هنا واضغط زر التأكيد. لو مش لاقي الرسالة، راجع البريد المهمل أو المزعج أو تبويب العروض الترويجية/التحديثات.';
  }

  get checkButtonText(): string {
    return this.loading
      ? this.currentLang === 'en'
        ? 'Checking...'
        : 'جارٍ التأكد...'
      : this.currentLang === 'en'
        ? 'I verified my email'
        : 'تم تفعيل البريد';
  }

  get resendButtonText(): string {
    return this.resendLoading
      ? this.currentLang === 'en'
        ? 'Sending...'
        : 'جارٍ الإرسال...'
      : this.currentLang === 'en'
        ? 'Resend verification email'
        : 'إعادة إرسال رابط التفعيل';
  }

  async checkVerification(): Promise<void> {
    this.loading = true;
    this.error = '';
    this.message = '';

    try {
      const user = await this.auth.reloadCurrentUser();

      if (!user) {
        await this.router.navigate(['/login'], {
          queryParams: { redirect: this.redirectUrl },
        });
        return;
      }

      if (!this.auth.needsEmailVerification(user)) {
        await this.router.navigateByUrl(this.redirectUrl);
        return;
      }

      this.error = this.currentLang === 'en'
        ? 'Your email is not verified yet. Please click the verification link first.'
        : 'البريد لم يتم تفعيله بعد. من فضلك اضغط رابط التفعيل داخل الإيميل أولًا.';
    } catch (e: any) {
      this.error = e?.message || (this.currentLang === 'en' ? 'Could not check verification status.' : 'تعذر التأكد من حالة التفعيل.');
    } finally {
      this.loading = false;
    }
  }

  async resend(): Promise<void> {
    this.resendLoading = true;
    this.error = '';
    this.message = '';

    try {
      await this.auth.sendVerificationEmail();
      this.message = this.currentLang === 'en'
        ? 'Verification email sent again. Please check your inbox, Spam, Junk, Promotions, or Updates folders.'
        : 'تم إرسال رابط التفعيل مرة أخرى. راجع صندوق الوارد، ولو مش موجود راجع البريد المهمل أو المزعج أو تبويب العروض الترويجية/التحديثات.';
    } catch (e: any) {
      this.error = e?.message || (this.currentLang === 'en' ? 'Could not resend verification email.' : 'تعذر إعادة إرسال رابط التفعيل.');
    } finally {
      this.resendLoading = false;
    }
  }

  private detectLangFromPath(): 'ar' | 'en' {
    const seg = window.location.pathname.split('/')[1];
    return seg === 'en' ? 'en' : 'ar';
  }
}
