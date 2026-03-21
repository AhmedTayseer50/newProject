import { Component } from '@angular/core';

@Component({
  selector: 'app-course-reviews',
  templateUrl: './course-reviews.component.html',
  styleUrls: ['./course-reviews.component.css']
})
export class CourseReviewsComponent {
  get isEnglish(): boolean {
    return window.location.pathname.startsWith('/en');
  }

  get pageDir(): 'rtl' | 'ltr' {
    return this.isEnglish ? 'ltr' : 'rtl';
  }

  get titleText(): string {
    return this.isEnglish ? 'Course reviews' : 'تقييمات الكورسات';
  }

  get subtitleText(): string {
    return this.isEnglish
      ? 'This page is currently under development and learners reviews will appear here later.'
      : 'هذه الصفحة قيد التطوير حاليًا، وسيتم عرض تقييمات وآراء المتدربين هنا لاحقًا.';
  }
}