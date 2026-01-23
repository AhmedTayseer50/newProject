// src/app/learning/lesson-view/lesson-view.component.ts
import {
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
  ElementRef,
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

    console.log('[lesson-view][postMessage] received:', data);

    if (data.type === 'PLAYER_STATE') {
      console.log('[lesson-view][postMessage] PLAYER_STATE:', data.state);

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
    private playerSession: PlayerSessionService,
  ) {}

  ngOnInit() {
    console.log('[lesson-view] ngOnInit ✅');

    window.addEventListener('message', this.onWindowMessage);

    // الاشتراك في تغيّر الباراميترز
    this.paramSub = this.route.paramMap.subscribe(async (pm: ParamMap) => {
      const newCourseId = pm.get('courseId')!;
      const newLessonId = pm.get('lessonId')!;

      console.log('[lesson-view] route paramMap changed:', {
        newCourseId,
        newLessonId,
      });

      const courseChanged = newCourseId !== this.courseId;

      this.courseId = newCourseId;
      this.lessonId = newLessonId;

      this.loading = true;
      this.error = undefined;

      console.log('[lesson-view] state reset -> loading=true, error cleared');
      console.log('[lesson-view] courseChanged?', courseChanged);

      try {
        if (courseChanged || this.lessons.length === 0) {
          console.log('[lesson-view] loading all lessons...');
          await this.loadAllLessons();
          console.log(
            '[lesson-view] lessons loaded ✅ count=',
            this.lessons.length,
          );
        } else {
          console.log(
            '[lesson-view] lessons cache reused ✅ count=',
            this.lessons.length,
          );
        }

        this.currentPos = this.lessons.findIndex((l) => l.id === this.lessonId);
        console.log('[lesson-view] currentPos:', this.currentPos);

        await this.loadCurrentLesson();
        console.log('[lesson-view] loadCurrentLesson finished ✅');
      } catch (e: any) {
        console.error('[lesson-view] ERROR in paramMap subscription:', e);
        this.error = e?.message ?? 'حدث خطأ';
      } finally {
        this.loading = false;
        console.log('[lesson-view] loading=false (finally)');
      }
    });
  }

  ngOnDestroy(): void {
    console.log('[lesson-view] ngOnDestroy 🧹');

    this.paramSub?.unsubscribe();
    window.removeEventListener('message', this.onWindowMessage);
    this.stopRandomPresenceScheduler();
    this.clearPresencePrompt();
  }

  private async loadAllLessons() {
    console.log(
      '[lesson-view] loadAllLessons() start:',
      `lessons/${this.courseId}`,
    );

    const allSnap = await get(ref(this.db, `lessons/${this.courseId}`));

    if (allSnap.exists()) {
      const obj = allSnap.val() as Record<
        string,
        {
          title?: string;
          lessonIndex?: number;
          videoProvider?: string;
          videoRef?: string;
        }
      >;

      this.lessons = Object.entries(obj)
        .map(([id, v]) => ({
          id,
          title: (v?.title ?? '').toString(),
          lessonIndex: Number(v?.lessonIndex ?? 0),
          videoProvider: (v?.videoProvider ?? 'youtube') as
            | 'youtube'
            | 'gdrive',
          videoRef: (v?.videoRef ?? '').toString(),
        }))
        .sort((a, b) => (a.lessonIndex ?? 0) - (b.lessonIndex ?? 0));

      console.log(
        '[lesson-view] loadAllLessons() ✅ first item:',
        this.lessons[0],
      );
    } else {
      this.lessons = [];
      console.warn('[lesson-view] loadAllLessons() -> no lessons found');
    }
  }

  private async loadCurrentLesson() {
    console.log(
      '[lesson-view] loadCurrentLesson() start:',
      `lessons/${this.courseId}/${this.lessonId}`,
    );

    const snap = await get(
      ref(this.db, `lessons/${this.courseId}/${this.lessonId}`),
    );
    if (!snap.exists()) {
      console.error('[lesson-view] lesson not found ❌');
      throw new Error('الدرس غير موجود');
    }

    const data = snap.val() as any;
    console.log('[lesson-view] lesson raw data:', data);

    this.title = data.title ?? '';
    this.videoProvider = (data.videoProvider ?? 'youtube') as
      | 'youtube'
      | 'gdrive';
    this.videoRef = data.videoRef;

    console.log('[lesson-view] parsed lesson:', {
      title: this.title,
      videoProvider: this.videoProvider,
      videoRef: this.videoRef,
    });

    if (!this.videoProvider || !this.videoRef) {
      this.playerUrl = undefined;
      this.safeUrl = undefined;
      console.warn('[lesson-view] missing videoProvider/videoRef -> no video');
      throw new Error('هذا الدرس لا يحتوي على فيديو بعد');
    }

    // ✅ الحصول على Session تشغيل مؤقت
    console.log('[lesson-view] getting idToken from currentUser...');
    const idToken = await this.auth.currentUser?.getIdToken();

    if (!idToken) {
      console.error('[lesson-view] no idToken ❌ (user not logged in?)');
      throw new Error('يرجى تسجيل الدخول لمشاهدة الفيديو');
    }

    console.log('[lesson-view] idToken acquired ✅ length=', idToken.length);

    console.log('[lesson-view] calling /api/player-session ...', {
      courseId: this.courseId,
      lessonId: this.lessonId,
      videoProvider: this.videoProvider,
      videoRef: this.videoRef,
    });

    const res = await firstValueFrom(
      this.playerSession.createSession({
        courseId: this.courseId,
        lessonId: this.lessonId,
        videoProvider: this.videoProvider,
        videoRef: this.videoRef,
        idToken,
      }),
    );

    console.log('[lesson-view] playerSession response ✅:', res);

    this.playerUrl = res.playerUrl;

    // تحديث الـ iframe
    this.safeUrl = this.playerUrl
      ? this.sanitizer.bypassSecurityTrustResourceUrl(this.playerUrl)
      : undefined;

    console.log('[lesson-view] iframe url set ✅:', {
      playerUrl: this.playerUrl,
      safeUrlDefined: !!this.safeUrl,
    });

    // Debug: هل iframe موجود بالفعل؟
    setTimeout(() => {
      const el = this.playerFrame?.nativeElement;
      console.log('[lesson-view] iframe DOM check:', {
        iframeExists: !!el,
        iframeSrcAttr: el?.getAttribute('src'),
        iframeSrcProp: el?.src,
      });
    }, 300);

    console.log('[lesson-view] now showing lesson:', {
      courseId: this.courseId,
      lessonId: this.lessonId,
      title: this.title,
      videoProvider: this.videoProvider,
      videoRef: this.videoRef,
      playerUrl: this.playerUrl,
    });
  }

  // ===== Presence Check Logic =====
  private startRandomPresenceScheduler() {
    console.log('[lesson-view] startRandomPresenceScheduler() called', {
      schedulerTimeoutId: !!this.schedulerTimeoutId,
      presenceRequired: this.presenceRequired,
      isPlaying: this.isPlaying,
    });

    if (this.schedulerTimeoutId || this.presenceRequired) return;

    const delayMs = this.randomBetween(60_000, 180_000); // 60-180 ثانية
    console.log('[lesson-view] presence scheduler delay(ms)=', delayMs);

    this.schedulerTimeoutId = setTimeout(() => {
      this.schedulerTimeoutId = null;

      console.log('[lesson-view] presence scheduler fired', {
        isPlaying: this.isPlaying,
        presenceRequired: this.presenceRequired,
      });

      if (this.isPlaying && !this.presenceRequired) {
        this.showPresencePrompt();
      } else {
        this.startRandomPresenceScheduler();
      }
    }, delayMs);
  }

  private stopRandomPresenceScheduler() {
    if (this.schedulerTimeoutId) {
      console.log(
        '[lesson-view] stopRandomPresenceScheduler() clearing timeout',
      );
      clearTimeout(this.schedulerTimeoutId);
      this.schedulerTimeoutId = null;
    }
  }

  private showPresencePrompt() {
    console.log('[lesson-view] showPresencePrompt() -> overlay ON');

    this.presenceRequired = true;
    this.countdown = 30;
    this.sendPlayerCommand('pause');

    this.countdownIntervalId = setInterval(() => {
      this.countdown--;
      console.log('[lesson-view] presence countdown:', this.countdown);

      if (this.countdown <= 0) {
        this.lockVideoUntilConfirm();
      }
    }, 1000);
  }

  confirmPresence() {
    console.log('[lesson-view] confirmPresence() -> overlay OFF and play');
    this.clearPresencePrompt();
    this.sendPlayerCommand('play');
    this.startRandomPresenceScheduler();
  }

  private lockVideoUntilConfirm() {
    console.warn(
      '[lesson-view] lockVideoUntilConfirm() -> countdown ended, keep paused',
    );

    if (this.countdownIntervalId) {
      clearInterval(this.countdownIntervalId);
      this.countdownIntervalId = null;
    }
    this.presenceRequired = true;
    this.countdown = 0;
    this.sendPlayerCommand('pause');
  }

  private clearPresencePrompt() {
    if (this.presenceRequired) {
      console.log('[lesson-view] clearPresencePrompt() -> overlay OFF');
    }

    this.presenceRequired = false;

    if (this.countdownIntervalId) {
      clearInterval(this.countdownIntervalId);
      this.countdownIntervalId = null;
    }
  }

  private sendPlayerCommand(command: 'play' | 'pause') {
    const win = this.playerFrame?.nativeElement?.contentWindow;

    console.log('[lesson-view] sendPlayerCommand:', {
      command,
      hasFrame: !!this.playerFrame?.nativeElement,
      hasContentWindow: !!win,
    });

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
    console.log('[lesson-view] goTo:', lessonId);
    this.router.navigate(['/lesson', this.courseId, lessonId]);
  }

  goPrev() {
    console.log('[lesson-view] goPrev clicked. hasPrev=', this.hasPrev);
    if (!this.hasPrev) return;

    const nextPos = this.currentPos - 1;
    this.router.navigate(['/lesson', this.courseId, this.lessons[nextPos].id]);
  }

  goNext() {
    console.log('[lesson-view] goNext clicked. hasNext=', this.hasNext);
    if (!this.hasNext) return;

    const nextPos = this.currentPos + 1;
    this.router.navigate(['/lesson', this.courseId, this.lessons[nextPos].id]);
  }

  onIframeLoad() {
    console.log('[lesson-view] ✅ iframe LOAD event fired');
    const el = this.playerFrame?.nativeElement;

    console.log('[lesson-view] iframe src attr:', el?.getAttribute('src'));
    console.log('[lesson-view] iframe src prop:', el?.src);
  }
}
