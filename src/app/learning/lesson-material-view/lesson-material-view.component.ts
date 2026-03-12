import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Database } from '@angular/fire/database';
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
    private sanitizer: DomSanitizer,
  ) {}

  async ngOnInit(): Promise<void> {
    this.courseId = this.route.snapshot.paramMap.get('courseId') || '';
    this.lessonId = this.route.snapshot.paramMap.get('lessonId') || '';

    if (!this.courseId || !this.lessonId) {
      this.error = 'بيانات الصفحة غير مكتملة';
      this.loading = false;
      return;
    }

    try {
      const snap = await get(ref(this.db, `lessons/${this.courseId}/${this.lessonId}`));

      if (!snap.exists()) {
        throw new Error('الدرس غير موجود');
      }

      const data = snap.val() as any;

      this.lessonTitle = data.title || '';
      this.pdfTitle = data.pdfTitle || '';
      this.pdfDriveFileId = data.pdfDriveFileId || '';

      if (!this.pdfDriveFileId) {
        throw new Error('لا توجد مادة علمية مرفوعة لهذا الدرس بعد');
      }

      const previewUrl = `https://drive.google.com/file/d/${this.pdfDriveFileId}/preview`;
      this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(previewUrl);
    } catch (e: any) {
      this.error = e?.message || 'تعذر تحميل المادة العلمية';
    } finally {
      this.loading = false;
    }
  }

  backToLesson(): void {
    this.router.navigate(['/lesson', this.courseId, this.lessonId]);
  }
}