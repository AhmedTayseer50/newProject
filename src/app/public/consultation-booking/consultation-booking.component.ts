import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { SessionRequestsService } from 'src/app/core/services/session-requests.service';
import emailjs from '@emailjs/browser';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-consultation-booking',
  templateUrl: './consultation-booking.component.html',
  styleUrls: ['./consultation-booking.component.css'],
})
export class ConsultationBookingComponent implements OnInit {
  sending = false;
  sent = false;
  error?: string;
  currentLang: 'ar' | 'en' = 'ar';

  readonly EGYPT = 'مصر';
  readonly OTHER = 'غير ذلك';

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    age: [
      null as any,
      [Validators.required, Validators.min(10), Validators.max(120)],
    ],
    job: ['', [Validators.required, Validators.minLength(2)]],
    maritalStatus: ['', [Validators.required]],
    whatsapp: [
      '',
      [Validators.required, Validators.pattern(/^\+?[0-9]{8,15}$/)],
    ],
    nationality: ['', [Validators.required]],
    nationalityOther: [''],
    problem: ['', [Validators.required, Validators.minLength(10)]],
    acceptedPolicy: [false, [Validators.requiredTrue]],
  });

  constructor(
    private fb: FormBuilder,
    private reqSvc: SessionRequestsService
  ) {
    this.form.get('nationality')?.valueChanges.subscribe((val) => {
      const otherCtrl = this.form.get('nationalityOther');
      if (!otherCtrl) return;

      if ((val || '').trim() === this.OTHER) {
        otherCtrl.setValidators([Validators.required, Validators.minLength(2)]);
      } else {
        otherCtrl.clearValidators();
        otherCtrl.setValue('');
      }

      otherCtrl.updateValueAndValidity({ emitEvent: false });
    });
  }

  ngOnInit(): void {
    this.currentLang = this.detectLangFromPath();
  }

  private detectLangFromPath(): 'ar' | 'en' {
    const seg = window.location.pathname.split('/')[1];
    return seg === 'en' ? 'en' : 'ar';
  }

  get effectiveNationality(): string {
    const n = (this.form.value.nationality || '').trim();
    if (n === this.OTHER) {
      return (this.form.value.nationalityOther || '').trim();
    }
    return n;
  }

  get isEgyptian(): boolean {
    return this.effectiveNationality === this.EGYPT;
  }

  get priceText(): string {
    return this.isEgyptian
      ? $localize`:@@consultation_price_egp:800 جنيه`
      : $localize`:@@consultation_price_usd:25 دولار`;
  }

  get nameError(): string {
    const c = this.form.get('name');
    if (!c || !c.touched || !c.errors) return '';

    if (c.errors['required']) {
      return $localize`:@@consultation_name_required:الاسم مطلوب`;
    }
    if (c.errors['minlength']) {
      return $localize`:@@consultation_name_min:الاسم يجب أن يكون 3 أحرف على الأقل`;
    }
    return '';
  }

  get ageError(): string {
    const c = this.form.get('age');
    if (!c || !c.touched || !c.errors) return '';

    if (c.errors['required']) {
      return $localize`:@@consultation_age_required:السن مطلوب`;
    }
    if (c.errors['min'] || c.errors['max']) {
      return $localize`:@@consultation_age_invalid:أدخل سنًا صحيحًا بين 10 و120`;
    }
    return '';
  }

  get jobError(): string {
    const c = this.form.get('job');
    if (!c || !c.touched || !c.errors) return '';

    if (c.errors['required']) {
      return $localize`:@@consultation_job_required:الوظيفة مطلوبة`;
    }
    if (c.errors['minlength']) {
      return $localize`:@@consultation_job_min:الوظيفة يجب أن تكون حرفين على الأقل`;
    }
    return '';
  }

  get maritalStatusError(): string {
    const c = this.form.get('maritalStatus');
    if (!c || !c.touched || !c.errors) return '';

    if (c.errors['required']) {
      return $localize`:@@consultation_marital_required:اختر الحالة الاجتماعية`;
    }
    return '';
  }

  get whatsappError(): string {
    const c = this.form.get('whatsapp');
    if (!c || !c.touched || !c.errors) return '';

    if (c.errors['required']) {
      return $localize`:@@consultation_whatsapp_required:رقم واتساب مطلوب`;
    }
    if (c.errors['pattern']) {
      return $localize`:@@consultation_whatsapp_invalid:أدخل رقمًا صحيحًا من 8 إلى 15 رقمًا`;
    }
    return '';
  }

  get nationalityError(): string {
    const c = this.form.get('nationality');
    if (!c || !c.touched || !c.errors) return '';

    if (c.errors['required']) {
      return $localize`:@@consultation_nationality_required:اختر الجنسية`;
    }
    return '';
  }

  get nationalityOtherError(): string {
    const c = this.form.get('nationalityOther');
    if (!c || !c.touched || !c.errors) return '';

    if (c.errors['required']) {
      return $localize`:@@consultation_nationality_other_required:اكتب الجنسية`;
    }
    if (c.errors['minlength']) {
      return $localize`:@@consultation_nationality_other_min:الجنسية يجب أن تكون حرفين على الأقل`;
    }
    return '';
  }

  get problemError(): string {
    const c = this.form.get('problem');
    if (!c || !c.touched || !c.errors) return '';

    if (c.errors['required']) {
      return $localize`:@@consultation_problem_required:وصف المشكلة مطلوب`;
    }
    if (c.errors['minlength']) {
      return $localize`:@@consultation_problem_min:اكتب وصفًا لا يقل عن 10 أحرف`;
    }
    return '';
  }

  get policyError(): string {
    const c = this.form.get('acceptedPolicy');
    if (!c || !c.touched || !c.errors) return '';

    if (c.errors['required']) {
      return $localize`:@@consultation_policy_required:يجب الموافقة على السياسة`;
    }
    return '';
  }

  private buildPrice() {
    return this.isEgyptian
      ? { currency: 'EGP' as const, price: 800 }
      : { currency: 'USD' as const, price: 25 };
  }

  private logFirebaseError(err: any) {
    console.error('❌ Firebase Error FULL:', err);
    console.error('❌ code:', err?.code);
    console.error('❌ message:', err?.message);
    console.error('❌ stack:', err?.stack);
  }

  async submit() {
    this.error = undefined;
    this.sent = false;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (
      (this.form.value.nationality || '').trim() === this.OTHER &&
      !this.effectiveNationality
    ) {
      this.form.get('nationalityOther')?.markAsTouched();
      this.form.get('nationalityOther')?.setErrors({ required: true });
      return;
    }

    this.sending = true;

    const p = this.buildPrice();
    const nationalitySelected = (this.form.value.nationality || '').trim();
    const nationalityOther = (this.form.value.nationalityOther || '').trim();

    const payload: any = {
      name: this.form.value.name!.trim(),
      age: Number(this.form.value.age),
      job: this.form.value.job!.trim(),
      maritalStatus: this.form.value.maritalStatus!,
      whatsapp: this.form.value.whatsapp!.trim(),
      nationality: nationalitySelected,
      problem: this.form.value.problem!.trim(),
      acceptedPolicy: !!this.form.value.acceptedPolicy,
      acknowledged: !!this.form.value.acceptedPolicy,
      currency: p.currency,
      price: p.price,
    };

    if (nationalitySelected === this.OTHER) {
      payload.nationalityOther = nationalityOther;
    }

    console.group('📨 SUBMIT Booking Request');
    console.log('payload:', payload);
    console.groupEnd();

    try {
      const id = await this.reqSvc.createRequest(payload);
      console.log('✅ Request created id:', id);

      try {
        await this.sendEmailNotification(payload);
        console.log('✅ EmailJS notification sent');
      } catch (emailErr) {
        console.error('❌ EmailJS send failed:', emailErr);
      }

      this.sent = true;
      this.form.reset({ acceptedPolicy: false } as any);
    } catch (e: any) {
      this.logFirebaseError(e);
      this.error =
        e?.message ??
        $localize`:@@consultation_submit_error:حدث خطأ أثناء إرسال الطلب`;
    } finally {
      this.sending = false;
    }
  }

  private async sendEmailNotification(payload: any) {
    const templateParams = {
      name: payload.name,
      age: payload.age,
      job: payload.job,
      marital_status: payload.maritalStatus,
      whatsapp: payload.whatsapp,
      nationality:
        payload.nationality === this.OTHER
          ? payload.nationalityOther || 'غير محدد'
          : payload.nationality,
      nationality_other: payload.nationalityOther || '',
      problem: payload.problem,
      accepted_policy: payload.acceptedPolicy ? 'نعم' : 'لا',
      currency: payload.currency,
      price: payload.price,
      submitted_at: new Date().toLocaleString('ar-EG'),
    };

    return emailjs.send(
      environment.emailJs.serviceId,
      environment.emailJs.templateId,
      templateParams,
      environment.emailJs.publicKey
    );
  }
}