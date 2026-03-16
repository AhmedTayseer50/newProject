import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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

  get isEnglish(): boolean {
    return window.location.pathname.startsWith('/en');
  }

  get totalPrice(): number {
    return Number(this.course?.price || 0);
  }

  async ngOnInit(): Promise<void> {
    this.courseId = this.route.snapshot.paramMap.get('courseId') || '';
    if (!this.courseId) {
      this.router.navigate(['/courses']);
      return;
    }

    try {
      this.course = await this.coursesService.getCourseById(this.courseId);

      const user = await this.getCurrentUser();
      if (user?.uid) {
        const profile = await this.userService.getUserProfile(user.uid);
        this.customerName = profile?.displayName || user.displayName || '';
        this.customerEmail = profile?.email || user.email || '';
        this.customerPhone = profile?.whatsapp || '';
      }
    } catch (e: any) {
      this.error = e?.message || 'حدث خطأ أثناء تحميل بيانات الشراء';
    } finally {
      this.loading = false;
    }
  }

  async payNow(): Promise<void> {
    this.error = '';

    if (!this.course) {
      this.error = 'الكورس غير متاح حالياً';
      return;
    }

    if (!this.customerName.trim()) {
      this.error = 'من فضلك أدخل الاسم';
      return;
    }

    if (!this.customerEmail.trim()) {
      this.error = 'من فضلك أدخل البريد الإلكتروني';
      return;
    }

    if (!this.customerPhone.trim()) {
      this.error = 'من فضلك أدخل رقم الواتساب أو الهاتف';
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
        'تعذر بدء عملية الدفع الآن، حاول مرة أخرى';
    } finally {
      this.submitting = false;
    }
  }

  private async getCurrentUser(): Promise<any> {
    return await new Promise((resolve) => {
      const auth = (window as any).ng?.getInjector?.(document.body)?.get?.('Auth');
      resolve(auth?.currentUser || null);
    }).catch(() => null);
  }
}