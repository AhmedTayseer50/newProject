import {
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
  ElementRef,
  NgZone,
  ChangeDetectorRef,
} from '@angular/core';
import { ActivatedRoute, Router, ParamMap } from '@angular/router';
import { Database } from '@angular/fire/database';
import { ref, get } from 'firebase/database';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subscription, firstValueFrom } from 'rxjs';
import { Auth } from '@angular/fire/auth';
import { PlayerSessionService } from './player-session.service';

type ViewLesson = {
  id: string;
  title: string;
  lessonIndex: number;
  videoProvider?: 'youtube' | 'gdrive';
  videoRef?: string;
  pdfDriveFileId?: string;
  pdfTitle?: string;
};

@Component({
  selector: 'app-lesson-view',
  templateUrl: './lesson-view.component.html',
  styleUrls: ['./lesson-view.component.css'],
})
export class LessonViewComponent implements OnInit, OnDestroy {
  courseId!: string;
  lessonId!: string;

  title = '';
  videoProvider?: 'youtube' | 'gdrive';
  videoRef?: string;
  pdfDriveFileId?: string;
  pdfTitle?: string;

  playerUrl?: string;
  safeUrl?: SafeResourceUrl;

  loading = true;
  error?: string;

  lessons: ViewLesson[] = [];
  currentPos = -1;

  private paramSub?: Subscription;

  presenceRequired = false;
  countdown = 30;

  private isPlaying = false;
  private schedulerTimeoutId: any = null;
  private countdownIntervalId: any = null;

  @ViewChild('playerFrame') playerFrame?: ElementRef<HTMLIFrameElement>;

  private readonly onWindowMessage = (ev: MessageEvent) => {
    this.zone.run(() => {
      if (!ev?.data || typeof ev.data !== 'object') return;
      const data: any = ev.data;

      if (data.type === 'PLAYER_STATE') {
        if (data.state === 'playing') {
          this.isPlaying = true;
          this.startRandomPresenceScheduler();
        } else if (data.state === 'paused') {
          this.isPlaying = false;
          this.stopRandomPresenceScheduler();

          if (!this.presenceRequired) {
            this.clearPresencePrompt();
          }
        } else if (data.state === 'ended') {
          this.isPlaying = false;
          this.stopRandomPresenceScheduler();
          this.clearPresencePrompt();
        }
      }

      this.cdr.detectChanges();
    });
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private db: Database,
    private sanitizer: DomSanitizer,
    private auth: Auth,
    private playerSession: PlayerSessionService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef,
  ) {}

  get isEnglish(): boolean {
    return window.location.pathname.startsWith('/en');
  }

  get pageDir(): 'rtl' | 'ltr' {
    return this.isEnglish ? 'ltr' : 'rtl';
  }

  get backLabel(): string {
    return this.isEnglish ? 'Back to course' : 'رجوع للكورس';
  }

  get lessonsCountLabel(): string {
    return this.isEnglish
      ? `Lessons count: ${this.totalLessons}`
      : `عدد الدروس: ${this.totalLessons}`;
  }

  get prevText(): string {
    return this.isEnglish ? 'Previous' : 'السابق';
  }

  get nextText(): string {
    return this.isEnglish ? 'Next' : 'التالي';
  }

  get loadingText(): string {
    return this.isEnglish ? 'Loading...' : 'جارِ التحميل…';
  }

  get materialButtonText(): string {
    return this.pdfTitle || (this.isEnglish ? 'View study material' : 'عرض المادة العلمية');
  }

  get videoTitleText(): string {
    return this.isEnglish ? 'Lesson video' : 'فيديو الدرس';
  }

  get presenceTitle(): string {
    return this.isEnglish ? 'Do you want to continue the lesson?' : 'هل ترغب في متابعة الدرس؟';
  }

  get continueText(): string {
    return this.isEnglish ? 'Continue' : 'متابعة';
  }

  get allLessonsText(): string {
    return this.isEnglish ? 'All lessons' : 'كل الدروس';
  }

  get lessonWord(): string {
    return this.isEnglish ? 'Lesson' : 'الدرس';
  }

  get untitledText(): string {
    return this.isEnglish ? 'Untitled' : 'بدون عنوان';
  }

  get watchText(): string {
    return this.isEnglish ? 'Watch' : 'مشاهدة';
  }

  get noLessonsText(): string {
    return this.isEnglish ? 'No lessons yet.' : 'لا توجد دروس بعد.';
  }

  get presenceMessage(): string {
    if (this.isEnglish) {
      return this.countdown > 0
        ? `To continue, press Continue within ${this.countdown} seconds.`
        : 'Press Continue to keep watching.';
    }

    return this.countdown > 0
      ? `للاستمرار، اضغط متابعة خلال ${this.countdown} ثانية.`
      : 'اضغط متابعة للاستمرار.';
  }

  ngOnInit() {
    window.addEventListener('message', this.onWindowMessage);

    this.paramSub = this.route.paramMap.subscribe(async (pm: ParamMap) => {
      const newCourseId = pm.get('courseId')!;
      const newLessonId = pm.get('lessonId')!;

      const courseChanged = newCourseId !== this.courseId;

      this.courseId = newCourseId;
      this.lessonId = newLessonId;

      this.loading = true;
      this.error = undefined;

      this.playerUrl = undefined;
      this.safeUrl = undefined;

      this.isPlaying = false;
      this.stopRandomPresenceScheduler();
      this.clearPresencePrompt();

      try {
        if (courseChanged || this.lessons.length === 0) {
          await this.loadAllLessons();
        }

        this.currentPos = this.lessons.findIndex((l) => l.id === this.lessonId);
        await this.loadCurrentLesson();
      } catch (e: any) {
        this.error = e?.message ?? (this.isEnglish ? 'An error occurred' : 'حدث خطأ');
      } finally {
        this.loading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.paramSub?.unsubscribe();
    window.removeEventListener('message', this.onWindowMessage);
    this.stopRandomPresenceScheduler();
    this.clearPresencePrompt();
  }

  private async loadAllLessons() {
    const allSnap = await get(ref(this.db, `lessons/${this.courseId}`));
    if (!allSnap.exists()) {
      this.lessons = [];
      return;
    }

    const obj = allSnap.val() as Record<
      string,
      {
        title?: string;
        lessonIndex?: number;
        videoProvider?: string;
        videoRef?: string;
        pdfDriveFileId?: string;
        pdfTitle?: string;
      }
    >;

    this.lessons = Object.entries(obj)
      .map(([id, v]) => ({
        id,
        title: (v?.title ?? '').toString(),
        lessonIndex: Number(v?.lessonIndex ?? 0),
        videoProvider: (v?.videoProvider ?? 'youtube') as 'youtube' | 'gdrive',
        videoRef: (v?.videoRef ?? '').toString(),
        pdfDriveFileId: (v?.pdfDriveFileId ?? '').toString(),
        pdfTitle: (v?.pdfTitle ?? '').toString(),
      }))
      .sort((a, b) => (a.lessonIndex ?? 0) - (b.lessonIndex ?? 0));
  }

  private async loadCurrentLesson() {
    const snap = await get(
      ref(this.db, `lessons/${this.courseId}/${this.lessonId}`),
    );
    if (!snap.exists()) {
      throw new Error(this.isEnglish ? 'Lesson not found' : 'الدرس غير موجود');
    }

    const data = snap.val() as any;

    this.title = data.title ?? '';
    this.videoProvider = (data.videoProvider ?? 'youtube') as 'youtube' | 'gdrive';
    this.videoRef = data.videoRef;
    this.pdfDriveFileId = data.pdfDriveFileId || '';
    this.pdfTitle = data.pdfTitle || '';

    if (!this.videoProvider || !this.videoRef) {
      this.playerUrl = undefined;
      this.safeUrl = undefined;
      throw new Error(
        this.isEnglish
          ? 'This lesson does not contain a video yet'
          : 'هذا الدرس لا يحتوي على فيديو بعد'
      );
    }

    const idToken = await this.auth.currentUser?.getIdToken();
    if (!idToken) {
      throw new Error(
        this.isEnglish
          ? 'Please sign in to watch the video'
          : 'يرجى تسجيل الدخول لمشاهدة الفيديو'
      );
    }

    const res = await firstValueFrom(
      this.playerSession.createSession({
        courseId: this.courseId,
        lessonId: this.lessonId,
        videoProvider: this.videoProvider,
        videoRef: this.videoRef,
        idToken,
      }),
    );

    const raw = String(res?.playerUrl ?? '');
    const url = raw.startsWith('/') ? raw : `/${raw}`;

    this.playerUrl = url;
    this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  private startRandomPresenceScheduler() {
    if (this.schedulerTimeoutId || this.presenceRequired) return;

    const delayMs = this.randomBetween(10 * 60_000, 30 * 60_000);
    this.schedulerTimeoutId = setTimeout(() => {
      this.schedulerTimeoutId = null;

      this.zone.run(() => {
        if (this.isPlaying && !this.presenceRequired) this.showPresencePrompt();
        else this.startRandomPresenceScheduler();
        this.cdr.detectChanges();
      });
    }, delayMs);
  }

  private stopRandomPresenceScheduler() {
    if (this.schedulerTimeoutId) {
      clearTimeout(this.schedulerTimeoutId);
      this.schedulerTimeoutId = null;
    }
  }

  private showPresencePrompt() {
    this.zone.run(() => {
      this.presenceRequired = true;
      this.countdown = 30;
      this.sendPlayerCommand('pause');
      this.cdr.detectChanges();

      this.countdownIntervalId = setInterval(() => {
        this.zone.run(() => {
          this.countdown--;
          this.cdr.detectChanges();
          if (this.countdown <= 0) this.lockVideoUntilConfirm();
        });
      }, 1000);
    });
  }

  confirmPresence() {
    this.zone.run(() => {
      this.clearPresencePrompt();
      this.sendPlayerCommand('play');
      this.startRandomPresenceScheduler();
      this.cdr.detectChanges();
    });
  }

  private lockVideoUntilConfirm() {
    if (this.countdownIntervalId) {
      clearInterval(this.countdownIntervalId);
      this.countdownIntervalId = null;
    }
    this.presenceRequired = true;
    this.countdown = 0;
    this.sendPlayerCommand('pause');
    this.cdr.detectChanges();
  }

  private clearPresencePrompt() {
    this.presenceRequired = false;
    if (this.countdownIntervalId) {
      clearInterval(this.countdownIntervalId);
      this.countdownIntervalId = null;
    }
    this.cdr.detectChanges();
  }

  private sendPlayerCommand(command: 'play' | 'pause') {
    const win = this.playerFrame?.nativeElement?.contentWindow;
    win?.postMessage({ type: 'PARENT_COMMAND', command }, '*');
  }

  private randomBetween(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  get totalLessons(): number {
    return this.lessons.length;
  }

  get hasPrev(): boolean {
    return this.currentPos > 0;
  }

  get hasNext(): boolean {
    return this.currentPos >= 0 && this.currentPos < this.lessons.length - 1;
  }

  goTo(lessonId: string) {
    this.router.navigate(['/lesson', this.courseId, lessonId]);
  }

  goPrev() {
    if (!this.hasPrev) return;
    const nextPos = this.currentPos - 1;
    this.router.navigate(['/lesson', this.courseId, this.lessons[nextPos].id]);
  }

  goNext() {
    if (!this.hasNext) return;
    const nextPos = this.currentPos + 1;
    this.router.navigate(['/lesson', this.courseId, this.lessons[nextPos].id]);
  }
}