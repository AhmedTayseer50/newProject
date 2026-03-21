import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {
  loading = false;
  error?: string;
  currentLang: 'ar' | 'en' = 'ar';

  form = this.fb.group({
    displayName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    whatsapp: [
      '',
      [Validators.required, Validators.pattern(/^[+0-9]{6,20}$/)],
    ],
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

  get displayNameControl() {
    return this.form.get('displayName');
  }

  get whatsappControl() {
    return this.form.get('whatsapp');
  }

  get emailControl() {
    return this.form.get('email');
  }

  get passwordControl() {
    return this.form.get('password');
  }

  get displayNameError(): string {
    const control = this.displayNameControl;
    if (!control || !control.touched || !control.errors) return '';

    if (control.errors['required']) {
      return $localize`:@@register_name_required:الاسم مطلوب`;
    }

    if (control.errors['minlength']) {
      return $localize`:@@register_name_minlength:الاسم يجب أن يكون حرفين على الأقل`;
    }

    if (control.errors['maxlength']) {
      return $localize`:@@register_name_maxlength:الاسم طويل جدًا`;
    }

    return '';
  }

  get whatsappError(): string {
    const control = this.whatsappControl;
    if (!control || !control.touched || !control.errors) return '';

    if (control.errors['required']) {
      return $localize`:@@register_whatsapp_required:رقم واتساب مطلوب`;
    }

    if (control.errors['pattern']) {
      return $localize`:@@register_whatsapp_pattern:أدخل رقم واتساب صحيحًا بالأرقام أو علامة + فقط`;
    }

    return '';
  }

  get emailError(): string {
    const control = this.emailControl;
    if (!control || !control.touched || !control.errors) return '';

    if (control.errors['required']) {
      return $localize`:@@register_email_required:البريد الإلكتروني مطلوب`;
    }

    if (control.errors['email']) {
      return $localize`:@@register_email_invalid:أدخل بريدًا إلكترونيًا صحيحًا`;
    }

    return '';
  }

  get passwordError(): string {
    const control = this.passwordControl;
    if (!control || !control.touched || !control.errors) return '';

    if (control.errors['required']) {
      return $localize`:@@register_password_required:كلمة المرور مطلوبة`;
    }

    if (control.errors['minlength']) {
      return $localize`:@@register_password_minlength:كلمة المرور يجب أن تكون 6 أحرف على الأقل`;
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
      const { email, password, displayName, whatsapp } = this.form.value;
      await this.auth.signup(email!, password!, {
        displayName: displayName!,
        whatsapp: whatsapp!,
      });
      this.router.navigateByUrl('/courses');
    } catch (e: any) {
      this.error =
        e?.message ?? $localize`:@@register_error_default:حدث خطأ أثناء إنشاء الحساب`;
    } finally {
      this.loading = false;
    }
  }

  private detectLangFromPath(): 'ar' | 'en' {
    const seg = window.location.pathname.split('/')[1];
    return seg === 'en' ? 'en' : 'ar';
  }
}