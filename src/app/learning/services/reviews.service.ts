import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Database } from '@angular/fire/database';
import { get, ref, set, update } from 'firebase/database';
import { EnrollmentsService } from 'src/app/core/services/enrollments.service';
import { CoursesService } from 'src/app/public/services/courses.service';

export interface UserCourseReview {
  rating: number;
  headline: string;
  comment: string;
  recommend: boolean;
  updatedAt: number;
}

export interface CourseReviewCard {
  courseId: string;
  title: string;
  description: string;
  thumbnail: string;
  publicAverageRating: number;
  publicReviewsCount: number;
  draft: UserCourseReview;
}

export interface CourseReviewsOverview {
  isAuthenticated: boolean;
  items: CourseReviewCard[];
}

@Injectable({
  providedIn: 'root',
})
export class ReviewsService {
  private auth = inject(Auth);
  private db = inject(Database);
  private enrollments = inject(EnrollmentsService);
  private courses = inject(CoursesService);

  async loadCurrentUserReviewCards(): Promise<CourseReviewsOverview> {
    const user = this.auth.currentUser;

    if (!user) {
      return {
        isAuthenticated: false,
        items: [],
      };
    }

    const [courseIds, reviewsSnap] = await Promise.all([
      this.enrollments.listUserEnrollments(user.uid),
      get(ref(this.db, `users/${user.uid}/courseReviews`)).catch(() => null),
    ]);

    const savedReviews = reviewsSnap?.exists() ? reviewsSnap.val() : {};

    const items = (
      await Promise.all(
        courseIds.map(async (courseId) => {
          const course = await this.courses.getCourseById(courseId);
          if (!course) return null;

          const publicRatings = (course.testimonials || [])
            .map((item) => Number(item.rating || 0))
            .filter((rating) => rating > 0);

          const averageRating = publicRatings.length
            ? publicRatings.reduce((sum, rating) => sum + rating, 0) / publicRatings.length
            : 0;

          const draft = savedReviews?.[courseId] || {};

          return {
            courseId,
            title: course.title || '',
            description: course.description || '',
            thumbnail: course.thumbnail || '',
            publicAverageRating: averageRating,
            publicReviewsCount: publicRatings.length,
            draft: {
              rating: Number(draft?.rating || 5) || 5,
              headline: `${draft?.headline || ''}`.trim(),
              comment: `${draft?.comment || ''}`.trim(),
              recommend: draft?.recommend !== false,
              updatedAt: Number(draft?.updatedAt || 0) || 0,
            },
          } satisfies CourseReviewCard;
        }),
      )
    ).filter((item): item is CourseReviewCard => !!item);

    return {
      isAuthenticated: true,
      items,
    };
  }

  async saveCurrentUserReview(courseId: string, draft: UserCourseReview): Promise<void> {
    const user = this.auth.currentUser;

    if (!user) {
      throw new Error('يجب تسجيل الدخول أولًا.');
    }

    const payload: UserCourseReview = {
      rating: Math.max(1, Math.min(5, Number(draft.rating || 5) || 5)),
      headline: `${draft.headline || ''}`.trim(),
      comment: `${draft.comment || ''}`.trim(),
      recommend: !!draft.recommend,
      updatedAt: Date.now(),
    };

    await Promise.all([
      set(ref(this.db, `users/${user.uid}/courseReviews/${courseId}`), payload),
      update(ref(this.db, `courseReviews/${courseId}/${user.uid}`), {
        ...payload,
        userId: user.uid,
      }),
    ]);
  }
}
