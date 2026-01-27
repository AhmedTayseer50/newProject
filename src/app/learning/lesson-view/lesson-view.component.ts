// src/app/learning/lesson-view/lesson-view.component.ts
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

  /** ✅ لازم SafeResourceUrl للـ iframe */
  safeUrl?: SafeResourceUrl;

  loading = true;
  error?: string;

  lessons: ViewLesson[] = [];
  currentPos = -1;

  private paramSub?: Subscription;

  // ===== Presence Check =====
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

      console.log('[lesson-view][postMessage] received:', data);

      if (data.type === 'PLAYER_STATE') {
        if (data.state === 'playing') {
          this.isPlaying = true;
          this.startRandomPresenceScheduler();
        } else if (data.state === 'paused') {
          // ✅ مهم: لما نوقف الفيديو بسبب الـ presence prompt،
          // ما نمسحش الرسالة (عشان ما تختفيش فورًا)
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

  ngOnInit() {
    console.log('[lesson-view] ngOnInit ✅');
    window.addEventListener('message', this.onWindowMessage);

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

      // reset state
      this.loading = true;
      this.error = undefined;

      // ✅ مهم: صَفّر الـ urls عشان Angular يعيد binding من جديد
      this.playerUrl = undefined;
      this.safeUrl = undefined;

      this.isPlaying = false;
      this.stopRandomPresenceScheduler();
      this.clearPresencePrompt();

      try {
        if (courseChanged || this.lessons.length === 0) {
          console.log('[lesson-view] loading all lessons...');
          await this.loadAllLessons();
          console.log(
            '[lesson-view] lessons loaded ✅ count=',
            this.lessons.length,
          );
        }

        this.currentPos = this.lessons.findIndex((l) => l.id === this.lessonId);
        console.log('[lesson-view] currentPos:', this.currentPos);

        await this.loadCurrentLesson();
        console.log('[lesson-view] loadCurrentLesson finished ✅');
      } catch (e: any) {
        console.error('[lesson-view] ERROR:', e);
        this.error = e?.message ?? 'حدث خطأ';
      } finally {
        this.loading = false;
        console.log('[lesson-view] loading=false (finally)');
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
    console.log(
      '[lesson-view] loadAllLessons() start:',
      `lessons/${this.courseId}`,
    );

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
      }
    >;

    this.lessons = Object.entries(obj)
      .map(([id, v]) => ({
        id,
        title: (v?.title ?? '').toString(),
        lessonIndex: Number(v?.lessonIndex ?? 0),
        videoProvider: (v?.videoProvider ?? 'youtube') as 'youtube' | 'gdrive',
        videoRef: (v?.videoRef ?? '').toString(),
      }))
      .sort((a, b) => (a.lessonIndex ?? 0) - (b.lessonIndex ?? 0));

    console.log('[lesson-view] loadAllLessons() ✅ first item:', this.lessons[0]);
  }

  private async loadCurrentLesson() {
    console.log(
      '[lesson-view] loadCurrentLesson() start:',
      `lessons/${this.courseId}/${this.lessonId}`,
    );

    const snap = await get(ref(this.db, `lessons/${this.courseId}/${this.lessonId}`));
    if (!snap.exists()) throw new Error('الدرس غير موجود');

    const data = snap.val() as any;

    this.title = data.title ?? '';
    this.videoProvider = (data.videoProvider ?? 'youtube') as 'youtube' | 'gdrive';
    this.videoRef = data.videoRef;

    if (!this.videoProvider || !this.videoRef) {
      this.playerUrl = undefined;
      this.safeUrl = undefined;
      throw new Error('هذا الدرس لا يحتوي على فيديو بعد');
    }

    // ===== create player session =====
    const idToken = await this.auth.currentUser?.getIdToken();
    if (!idToken) throw new Error('يرجى تسجيل الدخول لمشاهدة الفيديو');

    const res = await firstValueFrom(
      this.playerSession.createSession({
        courseId: this.courseId,
        lessonId: this.lessonId,
        videoProvider: this.videoProvider,
        videoRef: this.videoRef,
        idToken,
      }),
    );

    // ✅ خليها absolute path على نفس الدومين (مهم جدًا)
    const raw = String(res?.playerUrl ?? '');
    const url = raw.startsWith('/') ? raw : `/${raw}`;

    this.playerUrl = url;

    // ✅ ده اللي يمنع NG0904
    this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);

    console.log('[lesson-view] iframe url set ✅', { playerUrl: this.playerUrl });

    // Debug: اتأكد إن property src اتغير
    setTimeout(() => {
      const el = this.playerFrame?.nativeElement;
      console.log('[lesson-view] iframe DOM check:', {
        exists: !!el,
        srcProp: el?.src,
      });
    }, 200);
  }

  // ===== Presence =====
  private startRandomPresenceScheduler() {
    if (this.schedulerTimeoutId || this.presenceRequired) return;

    const delayMs = this.randomBetween(30_000, 60_000);
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
