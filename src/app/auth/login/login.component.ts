import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  loading = false;
  googleLoading = false;
  error?: string;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
  ) {}

  async onSubmit() {
    if (this.form.invalid) return;

    this.loading = true;
    this.error = undefined;

    try {
      const { email, password } = this.form.value;
      await this.auth.login(email!, password!);
      this.router.navigateByUrl('/courses');
    } catch (e: any) {
      this.error = e?.message ?? 'حدث خطأ أثناء تسجيل الدخول';
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
      // رسائل ألطف للمستخدم
      const msg = (e?.message || '').toString();
      if (msg.includes('popup') || msg.includes('Popup')) {
        this.error = 'تعذر فتح نافذة تسجيل Google. جرّب السماح بالنوافذ المنبثقة (Popups) ثم أعد المحاولة.';
      } else {
        this.error = e?.message ?? 'حدث خطأ أثناء تسجيل الدخول عبر Google';
      }
    } finally {
      this.googleLoading = false;
    }
  }
}
