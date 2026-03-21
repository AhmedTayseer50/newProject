import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent implements OnInit {
  sent = false;
  error?: string;
  currentLang: 'ar' | 'en' = 'ar';

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  constructor(private fb: FormBuilder, private auth: AuthService) {}

  ngOnInit(): void {
    this.currentLang = this.detectLangFromPath();
  }

  get emailControl() {
    return this.form.get('email');
  }

  get emailError(): string {
    const control = this.emailControl;
    if (!control || !control.touched || !control.errors) return '';

    if (control.errors['required']) {
      return $localize`:@@forgot_email_required:البريد الإلكتروني مطلوب`;
    }

    if (control.errors['email']) {
      return $localize`:@@forgot_email_invalid:أدخل بريدًا إلكترونيًا صحيحًا`;
    }

    return '';
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.error = undefined;

    try {
      await this.auth.resetPassword(this.form.value.email!);
      this.sent = true;
    } catch (e: any) {
      this.error =
        e?.message ?? $localize`:@@forgot_error_default:تعذّر إرسال رابط الاستعادة`;
    }
  }

  private detectLangFromPath(): 'ar' | 'en' {
    const seg = window.location.pathname.split('/')[1];
    return seg === 'en' ? 'en' : 'ar';
  }
}