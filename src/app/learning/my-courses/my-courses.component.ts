import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Observable } from 'rxjs';
import { Course } from 'src/app/shared/models/course.model';
import { MyCoursesService } from '../services/my-courses.service';

@Component({
  selector: 'app-my-courses',
  templateUrl: './my-courses.component.html',
  styleUrls: ['./my-courses.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyCoursesComponent {
  myCourses$: Observable<Course[]> = this.svc.myCourses$();

  constructor(private svc: MyCoursesService) {}

  get isEnglish(): boolean {
    return window.location.pathname.startsWith('/en');
  }

  get pageDir(): 'rtl' | 'ltr' {
    return this.isEnglish ? 'ltr' : 'rtl';
  }

  get eyebrowText(): string {
    return this.isEnglish ? 'My learning' : 'رحلتي التعليمية';
  }

  get pageTitle(): string {
    return this.isEnglish ? 'My courses' : 'كورساتي';
  }

  get pageSubtitle(): string {
    return this.isEnglish
      ? 'All courses you already own will appear here. Open any course and continue your learning directly.'
      : 'هنا ستجد كل الكورسات التي أصبحت متاحة لك بعد الاشتراك، ويمكنك فتح أي كورس ومتابعة التعلّم مباشرة.';
  }

  get emptyText(): string {
    return this.isEnglish
      ? 'No courses are available for you yet.'
      : 'لا توجد كورسات متاحة لك الآن.';
  }

  get emptyHintText(): string {
    return this.isEnglish
      ? 'Once a course is purchased or granted to your account, it will appear here automatically.'
      : 'بمجرد شراء كورس أو إضافته إلى حسابك سيظهر هنا تلقائيًا.';
  }

  get categoryFallback(): string {
    return this.isEnglish ? 'General' : 'عام';
  }

  get untitledText(): string {
    return this.isEnglish ? 'Untitled course' : 'بدون عنوان';
  }

  get noDescriptionText(): string {
    return this.isEnglish ? 'Course details will appear here soon.' : 'سيظهر وصف الكورس هنا قريبًا.';
  }

  get openCourseText(): string {
    return this.isEnglish ? 'Open course' : 'فتح الكورس';
  }

  trackByCourseId(_: number, course: Course): string {
    return course.id;
  }
}
