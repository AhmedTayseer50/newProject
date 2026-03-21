import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { CoursesService } from 'src/app/public/services/courses.service';
import { PaymentsService } from '../services/payments.service';
import { UserService } from 'src/app/core/services/user.service';
import { Course } from 'src/app/shared/models/course.model';

@Component({
  selector: 'app-purchase-course',
  templateUrl: './purchase-course.component.html',
  styleUrls: ['./purchase-course.component.css'],
})
export class PurchaseCourseComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(Auth);
  private coursesService = inject(CoursesService);
  private paymentsService = inject(PaymentsService);
  private userService = inject(UserService);

  courseId = '';
  course: Course | null = null;

  customerName = '';
  customerEmail = '';
  customerPhone = '';

  loading = true;
  submitting = false;
  error = '';

  get currentLang(): 'ar' | 'en' {
    return window.location.pathname.startsWith('/en') ? 'en' : 'ar';
  }

  get isEnglish(): boolean {
    return this.currentLang === 'en';
  }

  get totalPrice(): number {
    return Number(this.course?.price || 0);
  }

  get pageTitle(): string {
    return this.isEnglish ? 'Checkout' : 'إتمام الشراء';
  }

  get summaryTitle(): string {
    return this.isEnglish ? 'Order summary' : 'ملخص الطلب';
  }

  get totalLabel(): string {
    return this.isEnglish ? 'Total' : 'الإجمالي';
  }

  get fullNameLabel(): string {
    return this.isEnglish ? 'Full name' : 'الاسم الكامل';
  }

  get emailLabel(): string {
    return this.isEnglish ? 'Email' : 'البريد الإلكتروني';
  }

  get phoneLabel(): string {
    return this.isEnglish ? 'WhatsApp / Phone' : 'رقم الواتساب / الهاتف';
  }

  get payButtonText(): string {
    if (this.submitting) {
      return this.isEnglish
        ? 'Redirecting to payment...'
        : 'جارٍ التحويل إلى الدفع...';
    }

    return this.isEnglish ? 'Pay with Paymob' : 'الدفع عبر Paymob';
  }

  async ngOnInit(): Promise<void> {
    this.courseId = this.route.snapshot.paramMap.get('courseId') || '';
    if (!this.courseId) {
      this.router.navigate(['/courses']);
      return;
    }

    try {
      this.course = await this.coursesService.getCourseById(this.courseId);

      const user = this.auth.currentUser;
      if (user?.uid) {
        const profile = await this.userService.getUserProfile(user.uid);
        this.customerName = profile?.displayName || user.displayName || '';
        this.customerEmail = profile?.email || user.email || '';
        this.customerPhone = profile?.whatsapp || '';
      }
    } catch (e: any) {
      this.error =
        e?.message ||
        (this.isEnglish
          ? 'An error occurred while loading checkout data'
          : 'حدث خطأ أثناء تحميل بيانات الشراء');
    } finally {
      this.loading = false;
    }
  }

  async payNow(): Promise<void> {
    this.error = '';

    if (!this.course) {
      this.error = this.isEnglish
        ? 'This course is currently unavailable'
        : 'الكورس غير متاح حالياً';
      return;
    }

    if (!this.customerName.trim()) {
      this.error = this.isEnglish
        ? 'Please enter your full name'
        : 'من فضلك أدخل الاسم';
      return;
    }

    if (!this.customerEmail.trim()) {
      this.error = this.isEnglish
        ? 'Please enter your email address'
        : 'من فضلك أدخل البريد الإلكتروني';
      return;
    }

    if (!this.customerPhone.trim()) {
      this.error = this.isEnglish
        ? 'Please enter your WhatsApp number or phone'
        : 'من فضلك أدخل رقم الواتساب أو الهاتف';
      return;
    }

    this.submitting = true;

    try {
      const result = await this.paymentsService.startCheckout({
        courseIds: [this.courseId],
        customerName: this.customerName.trim(),
        customerEmail: this.customerEmail.trim(),
        customerPhone: this.customerPhone.trim(),
      });

      window.location.href = result.iframeUrl;
    } catch (e: any) {
      this.error =
        e?.error?.message ||
        e?.message ||
        (this.isEnglish
          ? 'Unable to start payment right now. Please try again.'
          : 'تعذر بدء عملية الدفع الآن، حاول مرة أخرى');
    } finally {
      this.submitting = false;
    }
  }
}