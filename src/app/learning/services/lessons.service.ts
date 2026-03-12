import { Injectable, inject } from '@angular/core';
import { Database } from '@angular/fire/database';
import { ref, get, onValue, off, query, orderByChild } from 'firebase/database';
import { Observable } from 'rxjs';

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  lessonIndex: number;
  videoProvider?: 'youtube' | 'gdrive';
  videoRef?: string;
  pdfDriveFileId?: string;
  pdfTitle?: string;
  createdAt?: number;
}

/** عناصر المنهج العام (public) – تُستخدم في صفحة التفاصيل بدون تسجيل دخول */
export interface PublicSyllabusItem {
  id: string;
  title?: string | null;
  lessonIndex?: number | null;
}

@Injectable({ providedIn: 'root' })
export class LessonsService {
  private db = inject(Database);

  /** 🔒 الدروس الحقيقية من /lessons/{courseId} (قد تتطلب صلاحية حسب القواعد) */
  async getByCourseOnce(courseId: string): Promise<Lesson[]> {
    const r = query(ref(this.db, `lessons/${courseId}`), orderByChild('lessonIndex'));
    const snap = await get(r);
    if (!snap.exists()) return [];
    const obj = snap.val() as Record<string, Omit<Lesson, 'id' | 'courseId'>>;
    return Object.entries(obj)
      .map(([id, data]) => ({ id, courseId, ...data }))
      .sort((a, b) => (a.lessonIndex ?? 0) - (b.lessonIndex ?? 0));
  }

  /** 🔒 مراقبة الدروس الحقيقية من /lessons/{courseId} */
  watchByCourse(courseId: string): Observable<Lesson[]> {
    return new Observable<Lesson[]>((sub) => {
      const r = query(ref(this.db, `lessons/${courseId}`), orderByChild('lessonIndex'));
      const h = onValue(
        r,
        (snap) => {
          if (!snap.exists()) { sub.next([]); return; }
          const obj = snap.val() as Record<string, Omit<Lesson, 'id' | 'courseId'>>;
          const list = Object.entries(obj)
            .map(([id, data]) => ({ id, courseId, ...data }))
            .sort((a, b) => (a.lessonIndex ?? 0) - (b.lessonIndex ?? 0));
          sub.next(list);
        },
        (err) => sub.error(err)
      );
      return () => { off(r); };
    });
  }
 
  // this part --------------------------------------------------------------------------------------------
  /** ✅ المنهج العام (عناوين/ترتيب فقط) من /syllabus/{courseId} — متاح للقراءة للجميع */
  async getSyllabusByCourseOnce(courseId: string): Promise<PublicSyllabusItem[]> {
    const r = query(ref(this.db, `syllabus/${courseId}`), orderByChild('lessonIndex'));
    const snap = await get(r);
    if (!snap.exists()) return [];
    const obj = snap.val() as Record<string, { title?: string; lessonIndex?: number }>;
    return Object.entries(obj)
      .map(([id, v]) => ({
        id,
        title: v?.title ?? null,
        lessonIndex: v?.lessonIndex ?? null,
      }))
      .sort((a, b) => (a.lessonIndex ?? Number.MAX_SAFE_INTEGER) - (b.lessonIndex ?? Number.MAX_SAFE_INTEGER));
  }

  /** ✅ مراقبة المنهج العام */
  watchSyllabusByCourse(courseId: string): Observable<PublicSyllabusItem[]> {
    return new Observable<PublicSyllabusItem[]>((sub) => {
      const r = query(ref(this.db, `syllabus/${courseId}`), orderByChild('lessonIndex'));
      const h = onValue(
        r,
        (snap) => {
          if (!snap.exists()) { sub.next([]); return; }
          const obj = snap.val() as Record<string, { title?: string; lessonIndex?: number }>;
          const list = Object.entries(obj)
            .map(([id, v]) => ({
              id,
              title: v?.title ?? null,
              lessonIndex: v?.lessonIndex ?? null,
            }))
            .sort((a, b) => (a.lessonIndex ?? Number.MAX_SAFE_INTEGER) - (b.lessonIndex ?? Number.MAX_SAFE_INTEGER));
          sub.next(list);
        },
        (err) => sub.error(err)
      );
      return () => { off(r); };
    });
  }
}
