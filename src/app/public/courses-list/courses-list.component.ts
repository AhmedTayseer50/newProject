import { Component, OnDestroy, OnInit } from '@angular/core';
import { CoursesService } from '../services/courses.service';
import { Course } from 'src/app/shared/models/course.model';
import { EnrollmentsService } from 'src/app/core/services/enrollments.service';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Subscription, firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';

import { DiplomasService } from '../services/diplomas.service';
import { WhatsAppService } from 'src/app/core/services/whatsapp.service';

@Component({
  selector: 'app-courses-list',
  templateUrl: './courses-list.component.html',
  styleUrls: ['./courses-list.component.css']
})
export class CoursesListComponent implements OnInit, OnDestroy {

  loading = true;
  courses: Course[] = [];
  error?: string;

  search: string = "";

  // هل المستخدم عامل تسجيل دخول؟
  isLoggedIn = false;

  // IDs الكورسات المسموح بها للمستخدم
  myCourseIds = new Set<string>();

  private subCourses?: Subscription;
  private subAuth?: Subscription;

  constructor(
    private coursesSvc: CoursesService,
    private enrollmentsSvc: EnrollmentsService,
    private auth: AuthService,
    private diplomasSvc: DiplomasService,
    private wa: WhatsAppService
  ) {}

  ngOnInit(): void {
    // 1) تابع الكورسات Realtime
    this.subCourses = this.coursesSvc.watchCourses().subscribe({
      next: (list) => {
        this.courses = list;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.message ?? 'حدث خطأ غير متوقع';
        this.loading = false;
      }
    });

    // 2) تابع تسجيل الدخول + هات صلاحيات الكورسات للمستخدم الحالي
    this.subAuth = this.auth.user$.subscribe(async (u) => {
      this.isLoggedIn = !!u;
      this.myCourseIds.clear();

      if (!u) return;

      try {
        const ids = await this.enrollmentsSvc.listUserEnrollments(u.uid);
        this.myCourseIds = new Set(ids);
      } catch (e) {
        this.myCourseIds.clear();
      }
    });
  }

  ngOnDestroy(): void {
    this.subCourses?.unsubscribe();
    this.subAuth?.unsubscribe();
  }

  // هل المستخدم له صلاحية على كورس معيّن؟
  hasAccess(courseId: string): boolean {
    return this.isLoggedIn && this.myCourseIds.has(courseId);
  }

  // ✅ زر انضم الآن => واتساب + رسالة فيها اسم الكورس + أسماء الدبلومات المرتبطة
  async joinNow(c: Course) {
    const courseTitle = (c?.title || '').trim() || 'بدون اسم';

    let diplomaNames: string[] = [];
    try {
      const diplomas = await firstValueFrom(this.diplomasSvc.watchDiplomas().pipe(take(1)));
      diplomaNames = diplomas
        .filter(d => !!d.courseIds?.[c.id])
        .map(d => (d.title || '').trim())
        .filter(Boolean);
    } catch {
      // لو فشلنا نجيب الدبلومات، كمل عادي
      diplomaNames = [];
    }

    const lines: string[] = [];
    lines.push(`أريد الاشتراك على كورس: ${courseTitle}`);
    if (diplomaNames.length) {
      lines.push(`الدبلومات المرتبطة: ${diplomaNames.join('، ')}`);
    }

    this.wa.open(lines.join('\n'));
  }
}
