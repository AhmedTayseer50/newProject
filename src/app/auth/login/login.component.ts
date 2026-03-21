import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  loading = false;
  googleLoading = false;
  error?: string;
  currentLang: 'ar' | 'en' = 'ar';

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentLang = this.detectLangFromPath();
  }

  get emailControl() {
    return this.form.get('email');
  }

  get passwordControl() {
    return this.form.get('password');
  }

  get emailError(): string {
    const control = this.emailControl;
    if (!control || !control.touched || !control.errors) return '';

    if (control.errors['required']) {
      return $localize`:@@login_email_required:البريد الإلكتروني مطلوب`;
    }

    if (control.errors['email']) {
      return $localize`:@@login_email_invalid:أدخل بريدًا إلكترونيًا صحيحًا`;
    }

    return '';
  }

  get passwordError(): string {
    const control = this.passwordControl;
    if (!control || !control.touched || !control.errors) return '';

    if (control.errors['required']) {
      return $localize`:@@login_password_required:كلمة المرور مطلوبة`;
    }

    if (control.errors['minlength']) {
      return $localize`:@@login_password_minlength:كلمة المرور يجب أن تكون 6 أحرف على الأقل`;
    }

    return '';
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = undefined;

    try {
      const { email, password } = this.form.value;
      await this.auth.login(email!, password!);
      this.router.navigateByUrl('/courses');
    } catch (e: any) {
      this.error =
        e?.message ?? $localize`:@@login_error_default:حدث خطأ أثناء تسجيل الدخول`;
    } finally {
      this.loading = false;
    }
  }

  async onGoogleLogin() {
    this.googleLoading = true;
    this.error = undefined;

    try {
      await this.auth.loginWithGoogle();
      this.router.navigateByUrl('/courses');
    } catch (e: any) {
      const msg = (e?.message || '').toString();

      if (msg.includes('popup') || msg.includes('Popup')) {
        this.error = $localize`:@@login_google_popup_error:تعذر فتح نافذة تسجيل Google. جرّب السماح بالنوافذ المنبثقة ثم أعد المحاولة.`;
      } else {
        this.error =
          e?.message ??
          $localize`:@@login_google_error_default:حدث خطأ أثناء تسجيل الدخول عبر Google`;
      }
    } finally {
      this.googleLoading = false;
    }
  }

  private detectLangFromPath(): 'ar' | 'en' {
    const seg = window.location.pathname.split('/')[1];
    return seg === 'en' ? 'en' : 'ar';
  }
}