// src/app/learning/lesson-view/lesson-view.component.ts
import { Component, OnDestroy, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router, ParamMap } from '@angular/router';
import { Database } from '@angular/fire/database';
import { ref, get } from 'firebase/database';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { Auth } from '@angular/fire/auth';
import { PlayerSessionService } from './player-session.service';

type ViewLesson = {
  id: string;
  title: string;
  lessonIndex: number;
  videoProvider?: 'youtube';
  videoRef?: string;
};

@Component({
  selector: 'app-lesson-view',
  templateUrl: './lesson-view.component.html',
  styleUrls: ['./lesson-view.component.css']
})
export class LessonViewComponent implements OnInit, OnDestroy {
  courseId!: string;
  lessonId!: string;

  title = '';
  videoProvider?: 'youtube';
  videoRef?: string;

  /** رابط داخلي مؤقت للاعب الفيديو (Vercel API) */
  playerUrl?: string;
  safeUrl?: SafeResourceUrl;

  loading = true;
  error?: string;

  lessons: ViewLesson[] = [];
  currentPos = -1; // index داخل lessons

  private paramSub?: Subscription;

  // ===== Presence Check (Anti-recording friction) =====
  presenceRequired = false;
  countdown = 30;

  private isPlaying = false;
  private schedulerTimeoutId: any = null;
  private countdownIntervalId: any = null;

  private readonly onWindowMessage = (ev: MessageEvent) => {
    // نتعامل فقط مع رسائل الـ iframe
    if (!ev?.data || typeof ev.data !== 'object') return;
    const data: any = ev.data;

    if (data.type === 'PLAYER_STATE') {
      if (data.state === 'playing') {
        this.isPlaying = true;
        this.startRandomPresenceScheduler();
      } else if (data.state === 'paused' || data.state === 'ended') {
        this.isPlaying = false;
        this.stopRandomPresenceScheduler();
        this.clearPresencePrompt();
      }
    }
  };

  @ViewChild('playerFrame') playerFrame?: ElementRef<HTMLIFrameElement>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private db: Database,
    private sanitizer: DomSanitizer,
    private auth: Auth,
    private playerSession: PlayerSessionService
  ) {}

  ngOnInit() {
    window.addEventListener('message', this.onWindowMessage);

    // مفتاح الحل: الاشتراك في تغيّر الباراميترز
    this.paramSub = this.route.paramMap.subscribe(async (pm: ParamMap) => {
      const newCourseId = pm.get('courseId')!;
      const newLessonId = pm.get('lessonId')!;

      const courseChanged = newCourseId !== this.courseId;

      this.courseId = newCourseId;
      this.lessonId = newLessonId;

      this.loading = true;
      this.error = undefined;

      try {
        // لو الكورس اتغيّر أو مفيش دروس لسه متحمّلة، حمّل قائمة الدروس
        if (courseChanged || this.lessons.length === 0) {
          await this.loadAllLessons();
        }

        // حدّد موضع الدرس الحالي
        this.currentPos = this.lessons.findIndex(l => l.id === this.lessonId);

        // حمّل بيانات الدرس الحالي
        await this.loadCurrentLesson();
      } catch (e: any) {
        this.error = e?.message ?? 'حدث خطأ';
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
    if (allSnap.exists()) {
      const obj = allSnap.val() as Record<
        string,
        { title?: string; lessonIndex?: number; videoProvider?: string; videoRef?: string }
      >;
      this.lessons = Object.entries(obj)
        .map(([id, v]) => ({
          id,
          title: (v?.title ?? '').toString(),
          lessonIndex: Number(v?.lessonIndex ?? 0),
          videoProvider: (v?.videoProvider ?? 'youtube') as any,
          videoRef: (v?.videoRef ?? '').toString(),
        }))
        .sort((a, b) => (a.lessonIndex ?? 0) - (b.lessonIndex ?? 0));
    } else {
      this.lessons = [];
    }
  }

  private async loadCurrentLesson() {
    const snap = await get(ref(this.db, `lessons/${this.courseId}/${this.lessonId}`));
    if (!snap.exists()) throw new Error('الدرس غير موجود');

    const data = snap.val() as any;
    this.title = data.title ?? '';
    this.videoProvider = (data.videoProvider ?? 'youtube') as any;
    this.videoRef = data.videoRef;

    if (!this.videoProvider || !this.videoRef) {
      this.playerUrl = undefined;
      this.safeUrl = undefined;
      throw new Error('هذا الدرس لا يحتوي على فيديو بعد');
    }

    // ✅ الحصول على Session تشغيل مؤقت (5 دقائق افتراضيًا)
    const idToken = await this.auth.currentUser?.getIdToken();
    if (!idToken) throw new Error('يرجى تسجيل الدخول لمشاهدة الفيديو');

    const res = await this.playerSession.createSession({
      courseId: this.courseId,
      lessonId: this.lessonId,
      videoProvider: this.videoProvider,
      videoRef: this.videoRef,
      idToken,
    });

    this.playerUrl = res.playerUrl;

    // تحديث الـ iframe
    this.safeUrl = this.playerUrl
      ? this.sanitizer.bypassSecurityTrustResourceUrl(this.playerUrl)
      : undefined;

    // (اختياري) لوج يساعدك تتأكد أن الفيديو اتغيّر فعلاً
    console.log('[lesson-view] now showing lesson:', {
      courseId: this.courseId,
      lessonId: this.lessonId,
      title: this.title,
      videoProvider: this.videoProvider,
      videoRef: this.videoRef,
      playerUrl: this.playerUrl
    });
  }

  // ===== Presence Check Logic =====
  private startRandomPresenceScheduler() {
    if (this.schedulerTimeoutId || this.presenceRequired) return;
    const delayMs = this.randomBetween(60_000, 180_000); // 60-180 ثانية
    this.schedulerTimeoutId = setTimeout(() => {
      this.schedulerTimeoutId = null;
      if (this.isPlaying && !this.presenceRequired) {
        this.showPresencePrompt();
      } else {
        this.startRandomPresenceScheduler();
      }
    }, delayMs);
  }

  private stopRandomPresenceScheduler() {
    if (this.schedulerTimeoutId) {
      clearTimeout(this.schedulerTimeoutId);
      this.schedulerTimeoutId = null;
    }
  }

  private showPresencePrompt() {
    this.presenceRequired = true;
    this.countdown = 30;
    this.sendPlayerCommand('pause');

    this.countdownIntervalId = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        this.lockVideoUntilConfirm();
      }
    }, 1000);
  }

  confirmPresence() {
    this.clearPresencePrompt();
    this.sendPlayerCommand('play');
    this.startRandomPresenceScheduler();
  }

  private lockVideoUntilConfirm() {
    if (this.countdownIntervalId) {
      clearInterval(this.countdownIntervalId);
      this.countdownIntervalId = null;
    }
    this.presenceRequired = true;
    this.countdown = 0;
    this.sendPlayerCommand('pause');
  }

  private clearPresencePrompt() {
    this.presenceRequired = false;
    if (this.countdownIntervalId) {
      clearInterval(this.countdownIntervalId);
      this.countdownIntervalId = null;
    }
  }

  private sendPlayerCommand(command: 'play' | 'pause') {
    // نرسل للأي فريم أمر تشغيل/إيقاف
    // (ملاحظة: في الإنتاج الأفضل تحديد origin بدل '*')
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
    // تغيّر الراوت -> الاشتراك في paramMap هيتكفّل بتحديث العرض
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
