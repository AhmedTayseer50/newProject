import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Observable } from 'rxjs';
import { Course } from 'src/app/shared/models/course.model';
import { MyCoursesService } from '../services/my-courses.service';

@Component({
  selector: 'app-my-courses',
  templateUrl: './my-courses.component.html',
  styleUrls: ['./my-courses.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyCoursesComponent {
  loading = true;
  error?: string;

  myCourses$: Observable<Course[]> = this.svc.myCourses$();

  constructor(private svc: MyCoursesService) {}

  get isEnglish(): boolean {
    return window.location.pathname.startsWith('/en');
  }

  get pageDir(): 'rtl' | 'ltr' {
    return this.isEnglish ? 'ltr' : 'rtl';
  }

  get pageTitle(): string {
    return this.isEnglish ? 'My courses' : 'كورساتي';
  }

  get emptyText(): string {
    return this.isEnglish
      ? 'No courses are available for you yet. When an admin grants you access to a course, it will appear here automatically.'
      : 'لا توجد كورسات متاحة لك الآن. عندما يمنحك الأدمن صلاحية على كورس سيظهر هنا تلقائيًا.';
  }

  get untitledText(): string {
    return this.isEnglish ? 'Untitled course' : 'بدون عنوان';
  }

  get openCourseText(): string {
    return this.isEnglish ? 'Open course' : 'فتح الكورس';
  }
}