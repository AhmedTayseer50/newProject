import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Database } from '@angular/fire/database';
import { Auth } from '@angular/fire/auth';
import { ref, get } from 'firebase/database';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-lesson-material-view',
  templateUrl: './lesson-material-view.component.html',
  styleUrls: ['./lesson-material-view.component.css'],
})
export class LessonMaterialViewComponent implements OnInit {
  courseId!: string;
  lessonId!: string;

  lessonTitle = '';
  pdfTitle = '';
  pdfDriveFileId = '';

  safePdfUrl?: SafeResourceUrl;
  loading = true;
  error?: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private db: Database,
    private auth: Auth,
    private sanitizer: DomSanitizer,
  ) {}

  get isEnglish(): boolean {
    return window.location.pathname.startsWith('/en');
  }

  get pageDir(): 'rtl' | 'ltr' {
    return this.isEnglish ? 'ltr' : 'rtl';
  }

  get backText(): string {
    return this.isEnglish ? 'Back to lesson' : 'رجوع للدرس';
  }

  get pageTitle(): string {
    return this.pdfTitle || (this.isEnglish ? 'Study material' : 'المادة العلمية');
  }

  get loadingText(): string {
    return this.isEnglish ? 'Loading study material...' : 'جارِ تحميل المادة العلمية…';
  }

  get frameTitle(): string {
    return this.isEnglish ? 'Lesson PDF' : 'ملف PDF الدرس';
  }

  async ngOnInit(): Promise<void> {
    this.courseId = this.route.snapshot.paramMap.get('courseId') || '';
    this.lessonId = this.route.snapshot.paramMap.get('lessonId') || '';

    if (!this.courseId || !this.lessonId) {
      this.error = this.isEnglish
        ? 'Page data is incomplete'
        : 'بيانات الصفحة غير مكتملة';
      this.loading = false;
      return;
    }

    try {
      const canAccessMaterial = await this.canAccessStudyMaterial();
      if (!canAccessMaterial) {
        throw new Error(
          this.isEnglish
            ? 'Study material PDF is not included in your selected plan.'
            : 'المادة العلمية PDF غير متاحة ضمن خطتك الحالية.'
        );
      }

      const snap = await get(ref(this.db, `lessons/${this.courseId}/${this.lessonId}`));

      if (!snap.exists()) {
        throw new Error(this.isEnglish ? 'Lesson not found' : 'الدرس غير موجود');
      }

      const data = snap.val() as any;

      this.lessonTitle = data.title || '';
      this.pdfTitle = data.pdfTitle || '';
      this.pdfDriveFileId = data.pdfDriveFileId || '';

      if (!this.pdfDriveFileId) {
        throw new Error(
          this.isEnglish
            ? 'No study material has been uploaded for this lesson yet'
            : 'لا توجد مادة علمية مرفوعة لهذا الدرس بعد'
        );
      }

      const previewUrl = `https://drive.google.com/file/d/${this.pdfDriveFileId}/preview`;
      this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(previewUrl);
    } catch (e: any) {
      this.error =
        e?.message ||
        (this.isEnglish ? 'Unable to load study material' : 'تعذر تحميل المادة العلمية');
    } finally {
      this.loading = false;
    }
  }

  private async canAccessStudyMaterial(): Promise<boolean> {
    const user = this.auth.currentUser;
    if (!user?.uid || !this.courseId) return false;

    const adminSnap = await get(ref(this.db, `users/${user.uid}/isAdmin`));
    if (adminSnap.exists() && adminSnap.val() === true) {
      return true;
    }

    const enrollmentSnap = await get(ref(this.db, `enrollments/${user.uid}/${this.courseId}`));
    if (!enrollmentSnap.exists()) return false;

    const enrollment = enrollmentSnap.val();
    if (enrollment === true) return true;

    return enrollment?.hideStudyMaterial !== true;
  }

  backToLesson(): void {
    this.router.navigate(['/lesson', this.courseId, this.lessonId]);
  }
}