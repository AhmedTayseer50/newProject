import { Component, OnDestroy, OnInit } from '@angular/core';
import { CoursesService } from '../../public/services/courses.service';
import { Course } from 'src/app/shared/models/course.model';

import { Auth, onAuthStateChanged, User } from '@angular/fire/auth';
import { EnrollmentsService } from 'src/app/core/services/enrollments.service';

import { DiplomasService } from '../services/diplomas.service';
import { WhatsAppService } from 'src/app/core/services/whatsapp.service';
import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  topCourses: Course[] = [];

  /** هل المستخدم مسجل دخول؟ */
  isLoggedIn = false;

  /** الكورسات اللي عنده صلاحية عليها */
  private myCourseIds = new Set<string>();

  private authUnsub?: () => void;

  constructor(
    private coursesSvc: CoursesService,
    private auth: Auth,
    private enrollments: EnrollmentsService,
    private diplomasSvc: DiplomasService,
    private wa: WhatsAppService
  ) {}

  ngOnInit(): void {
    this.coursesSvc.watchCourses().subscribe({
      next: (list) => {
        this.topCourses = list.slice(0, 3);
      },
      error: (err) => {
        console.error('خطأ في تحميل الكورسات:', err);
      }
    });

    this.authUnsub = onAuthStateChanged(this.auth, async (user: User | null) => {
      this.isLoggedIn = !!user;
      this.myCourseIds.clear();

      if (!user) return;

      try {
        const ids = await this.enrollments.listUserEnrollments(user.uid);
        ids.forEach(id => this.myCourseIds.add(id));
      } catch {
        this.myCourseIds.clear();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.authUnsub) this.authUnsub();
  }

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
      diplomaNames = [];
    }

    const lines: string[] = [];
    lines.push(`أريد الاشتراك على كورس: ${courseTitle}`);
    if (diplomaNames.length) {
      lines.push(`الدبلومات المرتبطة: ${diplomaNames.join('، ')}`);
    }

    this.wa.open(lines.join('\n'));
  }

  goToSection(sectionId: string) {
    const el = document.getElementById(sectionId);
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth' });
      }, 0);
    }
  }
}
