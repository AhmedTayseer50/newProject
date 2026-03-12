import { Injectable, inject } from '@angular/core';
import {
  Database,
  ref,
  push,
  set,
  update,
  remove,
  get,
} from '@angular/fire/database';

export type AdminLang = 'ar' | 'en';
export type LocalizedText = { ar: string; en: string };
export type LocalizedStringList = { ar: string[]; en: string[] };

export interface AdminCourseMetaItem {
  label: LocalizedText;
  value: LocalizedText;
}

export interface AdminCourseSectionCard {
  title: LocalizedText;
  description: LocalizedText;
}

export interface AdminCourseCurriculumItem {
  title: LocalizedText;
  points: LocalizedStringList;
}

export interface AdminCourseFaq {
  question: LocalizedText;
  answer: LocalizedText;
}

export interface AdminCourseTestimonial {
  name: LocalizedText;
  tag: LocalizedText;
  rating?: number;
  text: LocalizedText;
}

export interface AdminCoursePricingPlan {
  name: LocalizedText;
  badge: LocalizedText;
  priceText: LocalizedText;
  note: LocalizedText;
  highlighted?: boolean;
  features: LocalizedStringList;
}

export interface AdminCourseOffer {
  percent?: number;
  heading: LocalizedText;
  text: LocalizedText;
  ctaText: LocalizedText;
}

export interface AdminCourseBottomCta {
  text: LocalizedText;
  buttonText: LocalizedText;
}

export interface AdminCourse {
  title: LocalizedText;
  description: LocalizedText;
  price?: number;
  thumbnail?: string;
  categoryId?: LocalizedText;
  published?: boolean;
  createdAt?: number;

  heroEyebrow?: LocalizedText;
  heroTagline?: LocalizedText;
  heroTitleHighlight?: LocalizedText;

  lectureNames?: LocalizedStringList;

  programDuration?: LocalizedText;
  targetAudience?: LocalizedText;
  goalTitle?: LocalizedText;
  goalDescription?: LocalizedText;
  expectedStudyTimeTitle?: LocalizedText;
  expectedStudyTimeDescription?: LocalizedText;
  prerequisitesTitle?: LocalizedText;
  prerequisitesDescription?: LocalizedText;
  introVideoUrl?: string;

  meta?: AdminCourseMetaItem[];
  outcomes?: LocalizedStringList;
  audienceItems?: LocalizedStringList;
  sectionCards?: AdminCourseSectionCard[];
  curriculum?: AdminCourseCurriculumItem[];
  faqs?: AdminCourseFaq[];
  communityPerks?: LocalizedStringList;
  testimonials?: AdminCourseTestimonial[];
  pricingPlans?: AdminCoursePricingPlan[];
  offer?: AdminCourseOffer;
  bottomCta?: AdminCourseBottomCta;
}

export interface AdminLesson {
  title: string;
  lessonIndex: number;
  videoProvider?: 'youtube' | 'gdrive';
  videoRef?: string;
  pdfDriveFileId?: string;
  pdfTitle?: string;
  createdAt?: number;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private db = inject(Database);

  async listCourses(): Promise<Array<{ id: string } & AdminCourse>> {
    const snap = await get(ref(this.db, 'courses'));
    if (!snap.exists()) return [];
    const obj = snap.val() as Record<string, AdminCourse>;
    return Object.entries(obj).map(([id, data]) => ({ id, ...data }));
  }

  async getCourse(id: string): Promise<({ id: string } & AdminCourse) | null> {
    const snap = await get(ref(this.db, `courses/${id}`));
    return snap.exists() ? { id, ...(snap.val() as AdminCourse) } : null;
  }

  async createCourse(
    data: AdminCourse,
    opts?: { id?: string },
  ): Promise<string> {
    const now = Date.now();
    let id = opts?.id?.trim();

    const basePayload: AdminCourse = {
      ...data,
      createdAt: now,
      published: !!data.published,
    };

    if (id) {
      const existsSnap = await get(ref(this.db, `courses/${id}`));
      if (existsSnap.exists()) {
        throw new Error(`المعرّف "${id}" مستخدم بالفعل.`);
      }
      await set(ref(this.db, `courses/${id}`), basePayload);
      return id;
    }

    const listRef = ref(this.db, 'courses');
    const newRef = push(listRef);
    id = newRef.key!;
    await set(ref(this.db, `courses/${id}`), basePayload);
    return id;
  }

  async updateCourse(id: string, data: Partial<AdminCourse>): Promise<void> {
    await update(ref(this.db, `courses/${id}`), data);
  }

  async deleteCourse(id: string): Promise<void> {
    await remove(ref(this.db, `courses/${id}`));
  }

  async listLessons(
    courseId: string,
  ): Promise<Array<{ id: string } & AdminLesson>> {
    const snap = await get(ref(this.db, `lessons/${courseId}`));
    if (!snap.exists()) return [];
    const obj = snap.val() as Record<string, AdminLesson>;
    return Object.entries(obj)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => (a.lessonIndex ?? 0) - (b.lessonIndex ?? 0));
  }

  async addLesson(courseId: string, data: AdminLesson): Promise<string> {
    const listRef = ref(this.db, `lessons/${courseId}`);
    const newRef = push(listRef);
    const id = newRef.key!;

    const payload: AdminLesson = {
      title: data.title,
      lessonIndex: data.lessonIndex,
      videoProvider: (data.videoProvider ?? 'youtube') as 'youtube' | 'gdrive',
      videoRef: data.videoRef || '',
      pdfDriveFileId: data.pdfDriveFileId || '',
      pdfTitle: data.pdfTitle || '',
      createdAt: Date.now(),
    };

    await set(ref(this.db, `lessons/${courseId}/${id}`), payload);
    return id;
  }

  async updateLesson(
    courseId: string,
    lessonId: string,
    data: Partial<AdminLesson>,
  ): Promise<void> {
    await update(ref(this.db, `lessons/${courseId}/${lessonId}`), data);
  }

  async deleteLesson(courseId: string, lessonId: string): Promise<void> {
    await remove(ref(this.db, `lessons/${courseId}/${lessonId}`));
  }

  buildLocalizedText(value?: Partial<LocalizedText>): LocalizedText {
    return {
      ar: (value?.ar || '').trim(),
      en: (value?.en || '').trim(),
    };
  }

  buildLocalizedList(
    value?: Partial<LocalizedStringList>,
  ): LocalizedStringList {
    return {
      ar: Array.isArray(value?.ar)
        ? value!.ar.map((item) => `${item ?? ''}`.trim()).filter(Boolean)
        : [],
      en: Array.isArray(value?.en)
        ? value!.en.map((item) => `${item ?? ''}`.trim()).filter(Boolean)
        : [],
    };
  }
}
