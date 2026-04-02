// src/app/public/course-details/course-details.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CoursesService } from '../services/courses.service';
import {
  Auth,
  onAuthStateChanged,
  User,
  Unsubscribe,
} from '@angular/fire/auth';
import { EnrollmentsService } from 'src/app/core/services/enrollments.service';

import { firstValueFrom, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DiplomasService } from '../services/diplomas.service';
import { WhatsAppService } from 'src/app/core/services/whatsapp.service';

import { Database } from '@angular/fire/database';
import { ref, get, query, orderByChild, limitToFirst } from 'firebase/database';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Course, CoursePricingPlan } from 'src/app/shared/models/course.model';
import { TelegramJoinService } from '../services/telegram-join.service';
import { CartService } from 'src/app/billing/services/cart.service';

@Component({
  selector: 'app-course-details',
  templateUrl: './course-details.component.html',
  styleUrls: ['./course-details.component.css'],
})
export class CourseDetailsComponent implements OnInit, OnDestroy {
  public courseId!: string;
  public course: Course | null = null;

  defaultThumbnail =
    'https://images.pexels.com/photos/4100423/pexels-photo-4100423.jpeg?auto=compress&cs=tinysrgb&w=800';

  showOfferPopup = false;
  private offerShown = false;

  public lectureNames: string[] = [];
  public canViewLessons = false;
  public loading = true;
  public error?: string;
  public firstLessonId: string | null = null;
  public introVideoSafeUrl: SafeResourceUrl | null = null;

  public telegramEligible = false;
  public telegramUsed = false;
  public telegramBusy = false;
  public telegramMessage = '';

  private authUnsub?: Unsubscribe;
  private destroyed$ = new Subject<void>();

  constructor(
    public auth: Auth,
    private route: ActivatedRoute,
    private router: Router,
    private courses: CoursesService,
    private enrollments: EnrollmentsService,
    private db: Database,
    private sanitizer: DomSanitizer,
    private diplomasSvc: DiplomasService,
    private wa: WhatsAppService,
    private telegramJoin: TelegramJoinService,
    private cartSvc: CartService
  ) {}

  get isEnglish(): boolean {
    return window.location.pathname.startsWith('/en');
  }

  get currentLang(): 'ar' | 'en' {
    return this.isEnglish ? 'en' : 'ar';
  }

  get backLabel(): string {
    return this.isEnglish ? 'Back to courses' : 'رجوع لكل الكورسات';
  }

  get enrollButtonText(): string {
    if (this.course?.bottomCta?.buttonText?.trim()) {
      return this.course.bottomCta.buttonText;
    }
    return this.isEnglish ? 'Enroll now' : 'اشترك الآن';
  }

  get sectionTitleLearn(): string {
    return this.isEnglish
      ? 'What will you learn?'
      : 'ماذا ستتعلم داخل البرنامج؟';
  }

  get sectionTitleAudience(): string {
    return this.isEnglish
      ? 'Who is this program for?'
      : 'لمن صُمم هذا البرنامج؟';
  }

  get sectionTitleCurriculum(): string {
    return this.isEnglish ? 'Program curriculum' : 'محتوى البرنامج';
  }

  get sectionTitlePlans(): string {
    return this.isEnglish ? 'Choose your plan' : 'اختر الخطة المناسبة لك';
  }

  get sectionTitleTestimonials(): string {
    return this.isEnglish ? 'Participants feedback' : 'آراء وتجارب المشاركين';
  }

  get sectionTitleFaqs(): string {
    return this.isEnglish ? 'Frequently asked questions' : 'الأسئلة الشائعة';
  }

  get defaultGoalTitle(): string {
    return this.isEnglish ? 'Program goal' : 'هدف البرنامج';
  }

  get defaultExpectedStudyTitle(): string {
    return this.isEnglish ? 'Expected duration' : 'المدة المتوقعة';
  }

  get defaultPrerequisitesTitle(): string {
    return this.isEnglish ? 'Before you begin' : 'قبل أن تبدأ';
  }

  get defaultAudienceEmpty(): string {
    return this.isEnglish
      ? 'Audience details will be added soon.'
      : 'سيتم إضافة الفئة المستهدفة قريبًا.';
  }

  get defaultCurriculumEmpty(): string {
    return this.isEnglish
      ? 'Curriculum details will be added soon.'
      : 'سيتم إضافة تفاصيل المنهج قريبًا.';
  }

  get defaultOutcomesEmpty(): string {
    return this.isEnglish
      ? 'Learning outcomes will be added soon.'
      : 'سيتم إضافة مخرجات التعلم قريبًا.';
  }

  get defaultTestimonialsEmpty(): string {
    return this.isEnglish
      ? 'Testimonials will be added soon.'
      : 'سيتم إضافة الآراء والتجارب قريبًا.';
  }

  get defaultFaqEmpty(): string {
    return this.isEnglish
      ? 'FAQ section will be updated soon.'
      : 'سيتم تحديث قسم الأسئلة الشائعة قريبًا.';
  }

  get defaultNoAccess(): string {
    return this.isEnglish
      ? 'You do not have access to watch this course yet.'
      : 'لم يتم منحك الصلاحية لمشاهدة هذا الكورس بعد.';
  }

  get defaultAccessGranted(): string {
    return this.isEnglish
      ? 'You already have access to this course.'
      : 'لديك صلاحية مشاهدة هذا الكورس.';
  }

  get watchLessonsLabel(): string {
    return this.isEnglish ? 'Go to lessons' : 'اذهب لمشاهدة الدروس';
  }

  get pricingSubtitle(): string {
    return this.isEnglish
      ? 'Choose the format that fits your journey and current level of support.'
      : 'اختر الطريقة الأنسب لرحلتك الحالية ومستوى الدعم الذي تحتاجه.';
  }

  get heroFallbackEyebrow(): string {
    return this.isEnglish
      ? 'A practical transformative program'
      : 'برنامج عملي متكامل';
  }


  get selectedPriceLabel(): string {
    const featuredPlan = this.getFeaturedPlan();
    return featuredPlan?.priceText || this.course?.displayPriceText || `${this.course?.price || ''}`;
  }

  get selectedPlanLabel(): string {
    const featuredPlan = this.getFeaturedPlan();
    return featuredPlan?.name || (this.isEnglish ? 'Course enrollment' : 'الاشتراك في الكورس');
  }

  get heroFallbackTagline(): string {
    return this.isEnglish
      ? 'A guided journey that helps you understand, apply, and move toward a more balanced inner state.'
      : 'رحلة تعليمية تساعدك على الفهم والتطبيق والانتقال نحو توازن داخلي أعمق.';
  }

  private onWindowScroll = () => {
    if (this.canViewLessons) return;

    const scrollPosition = window.innerHeight + window.scrollY;
    const threshold = document.body.offsetHeight - 80;

    if (!this.offerShown && scrollPosition >= threshold) {
      this.offerShown = true;
      this.showOfferPopup = true;
    }
  };

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntil(this.destroyed$))
      .subscribe(async (pm) => {
        const id = pm.get('id');
        if (!id) return;

        this.courseId = id;
        this.loading = true;
        this.error = undefined;
        this.course = null;
        this.lectureNames = [];
        this.firstLessonId = null;
        this.introVideoSafeUrl = null;
        this.showOfferPopup = false;
        this.offerShown = false;

        this.telegramEligible = false;
        this.telegramUsed = false;
        this.telegramBusy = false;
        this.telegramMessage = '';

        try {
          this.course = await this.courses.getCourseById(this.courseId);
          this.lectureNames = (this.course?.lectureNames ?? []) as string[];

          const introUrl = this.course?.introVideoUrl as string | undefined;
          this.introVideoSafeUrl = introUrl
            ? this.sanitizer.bypassSecurityTrustResourceUrl(introUrl)
            : null;

          this.firstLessonId = await this.resolveFirstLessonIdFromRTDB(
            this.courseId
          );
        } catch (e: any) {
          this.error =
            e?.message ??
            (this.isEnglish
              ? 'An error occurred while loading the course.'
              : 'حدث خطأ أثناء تحميل الكورس');
        } finally {
          this.loading = false;
        }

        window.removeEventListener('scroll', this.onWindowScroll);
        window.addEventListener('scroll', this.onWindowScroll);
      });

    this.authUnsub = onAuthStateChanged(
      this.auth,
      async (user: User | null) => {
        if (!user) {
          this.canViewLessons = false;
          this.showOfferPopup = false;
          this.offerShown = false;
          this.telegramEligible = false;
          this.telegramUsed = false;
          this.telegramBusy = false;
          this.telegramMessage = '';
          return;
        }

        try {
          const myCourses = await this.enrollments.listUserEnrollments(
            user.uid
          );
          this.canViewLessons = myCourses.includes(this.courseId);

          if (this.canViewLessons) {
            this.showOfferPopup = false;
            this.offerShown = true;
            await this.loadTelegramAccessState(user.uid);
          } else {
            this.offerShown = false;
            this.telegramEligible = false;
            this.telegramUsed = false;
            this.telegramBusy = false;
            this.telegramMessage = '';
          }
        } catch {
          this.canViewLessons = false;
          this.telegramEligible = false;
          this.telegramUsed = false;
          this.telegramBusy = false;
          this.telegramMessage = '';
        }
      }
    );
  }

  ngOnDestroy(): void {
    if (this.authUnsub) this.authUnsub();
    this.destroyed$.next();
    this.destroyed$.complete();
    window.removeEventListener('scroll', this.onWindowScroll);
  }

  public async goToLessons(): Promise<void> {
    if (!this.firstLessonId) {
      this.firstLessonId = await this.resolveFirstLessonIdFromRTDB(
        this.courseId
      );
    }

    if (!this.firstLessonId) {
      console.warn('[goToLessons] no lessons found for course:', this.courseId);
      return;
    }

    this.router.navigate(['/lesson', this.courseId, this.firstLessonId]);
  }

  async goToPurchase(): Promise<void> {
    if (!this.auth.currentUser) {
      this.router.navigate(['/login'], {
        queryParams: {
          redirect: `/courses/${this.courseId}`,
        },
      });
      return;
    }

    this.scrollToPricing();
  }

  scrollToPricing(): void {
    const pricingSection = document.getElementById('course-pricing');
    if (!pricingSection) return;

    pricingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  getFeaturedPlan(): CoursePricingPlan | null {
    if (this.course?.pricingPlans?.length) {
      return this.course.pricingPlans.find((plan) => !!plan.highlighted) || this.course.pricingPlans[0] || null;
    }

    if (!this.course) return null;

    return {
      id: 'default-plan',
      name: this.isEnglish ? 'Course enrollment' : 'الاشتراك في الكورس',
      badge: '',
      priceText: this.course.displayPriceText || `${this.course.price || ''}`,
      note: this.isEnglish
        ? 'Course enrollment with the currently available price.'
        : 'اشتراك الكورس بالسعر المتاح حاليًا.',
      highlighted: true,
      features: [],
    };
  }

  addSelectedPlanToCart(plan: CoursePricingPlan | null): void {
    if (!this.course || !plan || !this.auth.currentUser) return;

    this.cartSvc.addCourse(this.course, plan);
  }

  buyPlan(plan: CoursePricingPlan | null): void {
    if (!plan) return;

    if (!this.auth.currentUser) {
      this.goToPurchase();
      return;
    }

    this.addSelectedPlanToCart(plan);
    this.router.navigate(['/cart']);
  }

  lessonLabel(index: number): string {
    return this.isEnglish ? `Lesson ${index + 1}` : `المحاضرة ${index + 1}`;
  }

  starsArray(rating?: number): number[] {
    const count = Math.max(0, Math.min(5, Number(rating || 0)));
    return Array.from({ length: count }, (_, i) => i + 1);
  }

  async joinTelegramGroup(): Promise<void> {
    if (this.telegramBusy || !this.telegramEligible) return;

    const user = this.auth.currentUser;
    if (!user) return;

    this.telegramBusy = true;
    this.error = undefined;

    try {
      const idToken = await user.getIdToken();
      const res = await firstValueFrom(
        this.telegramJoin.createSession(this.courseId, idToken)
      );

      this.telegramEligible = false;
      this.telegramUsed = true;
      this.telegramMessage = this.isEnglish
        ? 'Your Telegram registration has been recorded successfully. If the group does not open or you face any issue, please contact support and we will help you.'
        : 'تم تسجيل استخدام رابط التليجرام بنجاح. إذا لم يفتح الجروب معك أو واجهت أي مشكلة، يرجى التواصل مع الدعم وسنساعدك فورًا.';

      window.open(res.redirectUrl, '_blank', 'noopener');
    } catch (e: any) {
      this.error =
        e?.error ||
        e?.message ||
        (this.isEnglish
          ? 'Unable to open the Telegram group right now.'
          : 'تعذر فتح جروب التليجرام الآن.');
    } finally {
      this.telegramBusy = false;
    }
  }

  private async loadTelegramAccessState(uid: string): Promise<void> {
    try {
      const snap = await get(
        ref(this.db, `telegramAccess/${uid}/${this.courseId}`)
      );

      if (!snap.exists()) {
        this.telegramEligible = false;
        this.telegramUsed = false;
        this.telegramBusy = false;
        this.telegramMessage = '';
        return;
      }

      const data = snap.val() as {
        enabled?: boolean;
        status?: 'ready' | 'used';
        usedAt?: number | null;
      };

      this.telegramUsed = !!data?.usedAt || data?.status === 'used';
      this.telegramEligible = !!data?.enabled && !this.telegramUsed;
      this.telegramBusy = false;

      if (this.telegramUsed) {
        this.telegramMessage = this.isEnglish
          ? 'Your Telegram registration link has already been used. If you could not access the group, please contact support and we will help you.'
          : 'تم استخدام رابط التسجيل الخاص بجروب التليجرام بالفعل. إذا لم تتمكن من دخول الجروب، يرجى التواصل مع الدعم وسنساعدك في حل المشكلة.';
      } else {
        this.telegramMessage = '';
      }
    } catch {
      this.telegramEligible = false;
      this.telegramUsed = false;
      this.telegramBusy = false;
      this.telegramMessage = '';
    }
  }

  private async resolveFirstLessonIdFromRTDB(
    courseId: string
  ): Promise<string | null> {
    try {
      let firstId = await this.pickFirstKeyByChild(courseId, 'lessonIndex');
      if (firstId) return firstId;

      firstId = await this.pickFirstKeyByChild(courseId, 'createdAt');
      if (firstId) return firstId;

      const allSnap = await get(ref(this.db, `lessons/${courseId}`));
      if (allSnap.exists()) {
        const obj = allSnap.val() as Record<string, any>;
        const keys = Object.keys(obj);
        if (keys.length) return keys[0];
      }
      return null;
    } catch (e) {
      console.error('[resolveFirstLessonIdFromRTDB] error:', e);
      return null;
    }
  }

  private async pickFirstKeyByChild(
    courseId: string,
    child: string
  ): Promise<string | null> {
    const qy = query(
      ref(this.db, `lessons/${courseId}`),
      orderByChild(child),
      limitToFirst(1)
    );

    const snap = await get(qy);
    if (snap.exists()) {
      const val = snap.val() as Record<string, any>;
      const keys = Object.keys(val);
      if (keys.length) return keys[0];
    }

    return null;
  }

  addToCart(plan: CoursePricingPlan | null): void {
    if (!plan || !this.auth.currentUser) return;

    this.addSelectedPlanToCart(plan);

    alert(this.currentLang === 'en' ? 'Added to cart' : 'تمت الإضافة إلى السلة');
  }

  buyNow(): void {
    this.scrollToPricing();
  }

  closeOffer(): void {
    this.showOfferPopup = false;
  }

  onOfferBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeOffer();
    }
  }

  onOfferSubscribe(): void {
    if (this.canViewLessons) return;
    this.closeOffer();
    this.scrollToPricing();
  }
}