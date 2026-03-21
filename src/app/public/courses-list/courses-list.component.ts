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

  search = '';

  isLoggedIn = false;
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

  get isEnglish(): boolean {
    return window.location.pathname.startsWith('/en');
  }

  get pageDir(): 'rtl' | 'ltr' {
    return this.isEnglish ? 'ltr' : 'rtl';
  }

  get eyebrowText(): string {
    return this.isEnglish ? 'All courses' : 'جميع الكورسات';
  }

  get pageTitle(): string {
    return this.isEnglish ? 'Nabdah Hayah programs' : 'برامج نبضة حياة النفسية';
  }

  get pageSubtitle(): string {
    return this.isEnglish
      ? 'Explore all currently available courses, from childhood trauma and inner healing to fitrah, forgiveness, women-focused programs, and balanced personal growth.'
      : 'هنا تجد كل الكورسات المتاحة حاليًا، من صدمات الطفولة إلى أعماق النفس البشرية، مرورًا بالفطرة، قوة التسامح، وإعداد المرأة لحياة أكثر توازنًا.';
  }

  get searchLabel(): string {
    return this.isEnglish ? 'Search for a course' : 'ابحث عن كورس';
  }

  get searchPlaceholder(): string {
    return this.isEnglish ? 'Search for a course...' : 'ابحث عن كورس...';
  }

  get loadingText(): string {
    return this.isEnglish ? 'Loading...' : 'جارٍ التحميل…';
  }

  get categoryFallback(): string {
    return this.isEnglish ? 'General' : 'عام';
  }

  get openCourseText(): string {
    return this.isEnglish ? 'Open course' : 'فتح الكورس';
  }

  get detailsText(): string {
    return this.isEnglish ? 'View details' : 'عرض التفاصيل';
  }

  get enrollNowText(): string {
    return this.isEnglish ? 'Enroll now' : 'اشترك الآن';
  }

  ngOnInit(): void {
    this.subCourses = this.coursesSvc.watchCourses().subscribe({
      next: (list) => {
        this.courses = list;
        this.loading = false;
      },
      error: (err) => {
        this.error =
          err?.message ??
          (this.isEnglish ? 'An unexpected error occurred' : 'حدث خطأ غير متوقع');
        this.loading = false;
      }
    });

    this.subAuth = this.auth.user$.subscribe(async (u) => {
      this.isLoggedIn = !!u;
      this.myCourseIds.clear();

      if (!u) return;

      try {
        const ids = await this.enrollmentsSvc.listUserEnrollments(u.uid);
        this.myCourseIds = new Set(ids);
      } catch {
        this.myCourseIds.clear();
      }
    });
  }

  ngOnDestroy(): void {
    this.subCourses?.unsubscribe();
    this.subAuth?.unsubscribe();
  }

  hasAccess(courseId: string): boolean {
    return this.isLoggedIn && this.myCourseIds.has(courseId);
  }

  async joinNow(c: Course) {
    const courseTitle = (c?.title || '').trim() || (this.isEnglish ? 'Untitled course' : 'بدون اسم');

    let diplomaNames: string[] = [];
    try {
      const diplomas = await firstValueFrom(
        this.diplomasSvc.watchDiplomas().pipe(take(1))
      );
      diplomaNames = diplomas
        .filter((d) => !!d.courseIds?.[c.id])
        .map((d) => (d.title || '').trim())
        .filter(Boolean);
    } catch {
      diplomaNames = [];
    }

    const lines: string[] = [];

    if (this.isEnglish) {
      lines.push(`I would like to enroll in the course: ${courseTitle}`);
      if (diplomaNames.length) {
        lines.push(`Related diplomas: ${diplomaNames.join(', ')}`);
      }
    } else {
      lines.push(`أريد الاشتراك على كورس: ${courseTitle}`);
      if (diplomaNames.length) {
        lines.push(`الدبلومات المرتبطة: ${diplomaNames.join('، ')}`);
      }
    }

    this.wa.open(lines.join('\n'));
  }
}