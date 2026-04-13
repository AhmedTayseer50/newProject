import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Database } from '@angular/fire/database';
import { get, ref } from 'firebase/database';
import { EnrollmentsService } from 'src/app/core/services/enrollments.service';
import { CoursesService } from 'src/app/public/services/courses.service';

export interface CertificateCard {
  courseId: string;
  title: string;
  description: string;
  thumbnail: string;
  lecturesCount: number;
  status: 'issued' | 'tracking';
  issuedAt: number | null;
  certificateUrl: string | null;
}

export interface CertificatesOverview {
  isAuthenticated: boolean;
  issuedCount: number;
  trackingCount: number;
  items: CertificateCard[];
}

@Injectable({
  providedIn: 'root',
})
export class CertificatesService {
  private auth = inject(Auth);
  private db = inject(Database);
  private enrollments = inject(EnrollmentsService);
  private courses = inject(CoursesService);

  async loadCurrentUserCertificates(): Promise<CertificatesOverview> {
    const user = this.auth.currentUser;

    if (!user) {
      return {
        isAuthenticated: false,
        issuedCount: 0,
        trackingCount: 0,
        items: [],
      };
    }

    const [courseIds, certificatesSnap, legacyCertificatesSnap] = await Promise.all([
      this.enrollments.listUserEnrollments(user.uid),
      get(ref(this.db, `certificates/${user.uid}`)).catch(() => null),
      get(ref(this.db, `userCertificates/${user.uid}`)).catch(() => null),
    ]);

    const certificateMap = {
      ...(legacyCertificatesSnap?.exists() ? legacyCertificatesSnap.val() : {}),
      ...(certificatesSnap?.exists() ? certificatesSnap.val() : {}),
    };

    const items = (
      await Promise.all(
        courseIds.map(async (courseId) => {
          const course = await this.courses.getCourseById(courseId);
          if (!course) return null;

          const certificate = certificateMap?.[courseId] || {};
          const certificateUrl = `${certificate?.downloadUrl || certificate?.url || ''}`.trim();
          const status: 'issued' | 'tracking' = certificateUrl ? 'issued' : 'tracking';

          return {
            courseId,
            title: course.title || '',
            description: course.description || '',
            thumbnail: course.thumbnail || '',
            lecturesCount: Array.isArray(course.lectureNames) ? course.lectureNames.length : 0,
            status,
            issuedAt: Number(certificate?.issuedAt || 0) || null,
            certificateUrl: certificateUrl || null,
          } satisfies CertificateCard;
        }),
      )
    )
      .filter((item): item is CertificateCard => !!item)
      .sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === 'issued' ? -1 : 1;
        }

        return Number(b.issuedAt || 0) - Number(a.issuedAt || 0);
      });

    return {
      isAuthenticated: true,
      issuedCount: items.filter((item) => item.status === 'issued').length,
      trackingCount: items.filter((item) => item.status === 'tracking').length,
      items,
    };
  }
}
