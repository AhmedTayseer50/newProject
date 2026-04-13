import { Component, OnInit } from '@angular/core';
import {
  CourseReviewCard,
  CourseReviewsOverview,
  ReviewsService,
} from '../services/reviews.service';
import { HttpErrorService } from 'src/app/core/services/http-error.service';
import { NotificationsService } from 'src/app/core/services/notifications.service';

@Component({
  selector: 'app-course-reviews',
  templateUrl: './course-reviews.component.html',
  styleUrls: ['./course-reviews.component.css'],
})
export class CourseReviewsComponent implements OnInit {
  loading = true;
  overview: CourseReviewsOverview = {
    isAuthenticated: false,
    items: [],
  };
  savingStates: Record<string, boolean> = {};
  saveMessages: Record<string, string> = {};
  saveStatus: Record<string, 'success' | 'error' | ''> = {};

  constructor(
    private reviewsService: ReviewsService,
    private httpErrorService: HttpErrorService,
    private notificationsService: NotificationsService,
  ) {}

  ngOnInit(): void {
    void this.loadReviews();
  }

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
      ? 'Write and manage your course reviews, track your last saved feedback, and compare it with the visible public rating.'
      : 'اكتب تقييماتك للكورسات، وتابع آخر مراجعة محفوظة، وقارنها بمتوسط التقييم الظاهر للمتعلمين الآخرين من نفس الصفحة.';
  }

  get authTitle(): string {
    return this.isEnglish ? 'Sign in to manage your reviews' : 'سجل الدخول لإدارة تقييماتك';
  }

  get authText(): string {
    return this.isEnglish
      ? 'Your review drafts are linked to your account and appear here after login.'
      : 'مسودات تقييماتك مرتبطة بحسابك وتظهر هنا بعد تسجيل الدخول.';
  }

  get emptyTitle(): string {
    return this.isEnglish ? 'No enrolled courses yet' : 'لا توجد كورسات مسجلة بعد';
  }

  get emptyText(): string {
    return this.isEnglish
      ? 'Once you own a course, it will appear here so you can save your review from your account area.'
      : 'بمجرد امتلاكك لكورس سيظهر هنا لتتمكن من حفظ تقييمك من داخل حسابك.';
  }

  ratingLabel(value: number): string {
    return this.isEnglish ? `${value} / 5` : `${value} من 5`;
  }

  formatDate(timestamp: number): string {
    if (!timestamp) {
      return this.isEnglish ? 'Not saved yet' : 'لم يتم الحفظ بعد';
    }

    return new Intl.DateTimeFormat(this.isEnglish ? 'en' : 'ar', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(timestamp));
  }

  async saveReview(item: CourseReviewCard): Promise<void> {
    this.savingStates[item.courseId] = true;
    this.saveMessages[item.courseId] = '';
    this.saveStatus[item.courseId] = '';

    try {
      await this.reviewsService.saveCurrentUserReview(item.courseId, item.draft);
      item.draft.updatedAt = Date.now();
      this.saveMessages[item.courseId] = this.isEnglish
        ? 'Your review has been saved.'
        : 'تم حفظ تقييمك بنجاح.';
      this.saveStatus[item.courseId] = 'success';
      this.notificationsService.success(
        this.isEnglish ? 'Review saved' : 'تم حفظ التقييم',
        this.saveMessages[item.courseId],
      );
    } catch (error) {
      console.error('[CourseReviewsComponent] Failed to save review', error);
      this.saveMessages[item.courseId] = this.httpErrorService.resolve(error, {
        locale: this.isEnglish ? 'en' : 'ar',
        fallbackAr: 'تعذر حفظ التقييم الآن.',
        fallbackEn: 'Unable to save your review right now.',
      });
      this.saveStatus[item.courseId] = 'error';
      this.notificationsService.error(
        this.isEnglish ? 'Unable to save review' : 'تعذر حفظ التقييم',
        this.saveMessages[item.courseId],
      );
    } finally {
      this.savingStates[item.courseId] = false;
    }
  }

  private async loadReviews(): Promise<void> {
    this.loading = true;

    try {
      const overview = await this.reviewsService.loadCurrentUserReviewCards();
      this.overview = {
        ...overview,
        items: overview.items.map((item) => ({
          ...item,
          draft: { ...item.draft },
        })),
      };
    } catch (error) {
      this.notificationsService.error(
        this.isEnglish ? 'Unable to load reviews' : 'تعذر تحميل التقييمات',
        this.httpErrorService.resolve(error, {
          locale: this.isEnglish ? 'en' : 'ar',
          fallbackAr: 'تعذر تحميل تقييمات الكورسات الآن.',
          fallbackEn: 'Unable to load course reviews right now.',
        }),
      );
    } finally {
      this.loading = false;
    }
  }
}
