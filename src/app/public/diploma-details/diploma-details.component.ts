import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Auth } from '@angular/fire/auth';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { DiplomasService } from '../services/diplomas.service';
import { CoursesService } from '../services/courses.service';
import {
  Diploma,
  DiplomaMetaItem,
  DiplomaPricingPlan,
  DiplomaSectionCard,
  DiplomaTestimonial,
} from 'src/app/shared/models/diploma.model';
import { CartService } from 'src/app/billing/services/cart.service';

@Component({
  selector: 'app-diploma-details',
  templateUrl: './diploma-details.component.html',
  styleUrls: ['./diploma-details.component.css'],
})
export class DiplomaDetailsComponent implements OnInit, OnDestroy {
  diplomaId!: string;
  diploma: ({ id: string } & Diploma) | null = null;

  loading = true;
  error?: string;
  selectedPlanId = '';

  defaultThumbnail =
    'https://images.pexels.com/photos/4100423/pexels-photo-4100423.jpeg?auto=compress&cs=tinysrgb&w=800';

  introVideoSafeUrl: SafeResourceUrl | null = null;
  includedCourses: any[] = [];

  private destroyed$ = new Subject<void>();

  constructor(
    public auth: Auth,
    private route: ActivatedRoute,
    private router: Router,
    private diplomasSvc: DiplomasService,
    private coursesSvc: CoursesService,
    private sanitizer: DomSanitizer,
    private cartSvc: CartService
  ) {}

  get isEnglish(): boolean {
    return window.location.pathname.startsWith('/en');
  }

  get currentLang(): 'ar' | 'en' {
    return this.isEnglish ? 'en' : 'ar';
  }

  get pageDir(): 'rtl' | 'ltr' {
    return this.isEnglish ? 'ltr' : 'rtl';
  }

  get backLabel(): string {
    return this.isEnglish ? 'Back to diplomas' : 'رجوع لكل الدبلومات';
  }

  get loadingText(): string {
    return this.isEnglish ? 'Loading...' : 'جارٍ التحميل…';
  }

  get selectedPlan(): DiplomaPricingPlan | null {
    if (!this.diploma?.pricingPlans?.length) return null;
    return (
      this.diploma.pricingPlans.find(
        (plan) => this.resolvePlanId(plan) === this.selectedPlanId
      ) || this.getFeaturedPlan() || this.diploma.pricingPlans[0]
    );
  }

  get heroEyebrow(): string {
    return (
      this.diploma?.heroEyebrow ||
      (this.isEnglish
        ? 'A complete diploma path'
        : 'دبلومة متكاملة بمسار تدريجي')
    );
  }

  get heroTitle(): string {
    if (!this.diploma) {
      return this.isEnglish ? 'Diploma details' : 'تفاصيل الدبلومة';
    }

    const highlight = (this.diploma.heroTitleHighlight || '').trim();
    if (!highlight) {
      return this.diploma.title || '';
    }

    if ((this.diploma.title || '').includes(highlight)) {
      return this.diploma.title || '';
    }

    return `${this.diploma.title || ''} ${highlight}`.trim();
  }

  get heroTagline(): string {
    return (
      this.diploma?.heroTagline ||
      this.diploma?.description ||
      (this.isEnglish
        ? 'A structured diploma path built from the backend content of the diploma editor.'
        : 'مسار دبلومة منظم مبني بالكامل من محتوى الـ backend داخل محرر الدبلومات.')
    );
  }

  get heroMetaItems(): DiplomaMetaItem[] {
    if (!this.diploma?.metaItems?.length) return [];
    return this.diploma.metaItems.filter((item) => !!item.label || !!item.value);
  }

  get lectureNames(): string[] {
    return Array.isArray(this.diploma?.lectureNames)
      ? (this.diploma?.lectureNames || []).filter(Boolean)
      : [];
  }

  get sectionCards(): DiplomaSectionCard[] {
    return Array.isArray(this.diploma?.sectionCards)
      ? (this.diploma?.sectionCards || []).filter(
          (item) => !!item?.title || !!item?.description
        )
      : [];
  }

  get outcomes(): string[] {
    return Array.isArray(this.diploma?.outcomes)
      ? (this.diploma?.outcomes || []).filter(Boolean)
      : [];
  }

  get audienceItems(): string[] {
    return Array.isArray(this.diploma?.audienceItems)
      ? (this.diploma?.audienceItems || []).filter(Boolean)
      : [];
  }

  get communityPerks(): string[] {
    return Array.isArray(this.diploma?.communityPerks)
      ? (this.diploma?.communityPerks || []).filter(Boolean)
      : [];
  }

  get curriculum(): Array<{ title: string; points: string[] }> {
    if (!Array.isArray(this.diploma?.curriculum)) return [];

    return (this.diploma?.curriculum || []).filter(
      (item) => !!item?.title || !!item?.points?.length
    );
  }

  get faqs(): Array<{ question: string; answer: string }> {
    return Array.isArray(this.diploma?.faqs)
      ? (this.diploma?.faqs || []).filter(
          (item) => !!item?.question || !!item?.answer
        )
      : [];
  }

  get testimonials(): DiplomaTestimonial[] {
    return Array.isArray(this.diploma?.testimonials)
      ? (this.diploma?.testimonials || []).filter(
          (item) => !!item?.name || !!item?.text
        )
      : [];
  }

  get pricingPlans(): DiplomaPricingPlan[] {
    return Array.isArray(this.diploma?.pricingPlans)
      ? (this.diploma?.pricingPlans || []).filter(
          (item) => !!item?.name || !!item?.priceText
        )
      : [];
  }

  get pricingSubtitle(): string {
    return this.isEnglish
      ? 'Choose the plan that fits your current step, then continue to cart or checkout.'
      : 'اختر الخطة المناسبة لخطوتك الحالية، ثم أكمل إلى السلة أو الدفع.';
  }

  get loginToPurchaseText(): string {
    return this.isEnglish ? 'Login to purchase' : 'سجل دخول للشراء';
  }

  get addToCartText(): string {
    return this.isEnglish ? 'Add to cart' : 'أضف إلى السلة';
  }

  get buyNowText(): string {
    return this.isEnglish ? 'Buy now' : 'اشترِ الآن';
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroyed$)).subscribe(async (pm) => {
      const id = pm.get('id');
      if (!id) return;

      this.diplomaId = id;
      this.loading = true;
      this.error = undefined;
      this.diploma = null;
      this.includedCourses = [];
      this.introVideoSafeUrl = null;
      this.selectedPlanId = '';

      try {
        const diploma = await this.diplomasSvc.getDiplomaById(id);
        if (!diploma) {
          this.error = this.isEnglish ? 'Diploma not found' : 'الدبلومة غير موجودة';
          return;
        }

        this.diploma = diploma;
        this.introVideoSafeUrl = diploma.introVideoUrl
          ? this.sanitizer.bypassSecurityTrustResourceUrl(diploma.introVideoUrl)
          : null;

        const defaultPlan = this.getFeaturedPlan() || this.pricingPlans[0] || null;
        this.selectedPlanId = defaultPlan ? this.resolvePlanId(defaultPlan) : '';

        const courseIds = Object.keys(diploma.courseIds || {}).filter(Boolean);
        if (courseIds.length) {
          const courses = await Promise.all(
            courseIds.map((courseId) => this.coursesSvc.getCourseById(courseId))
          );
          this.includedCourses = courses.filter(Boolean);
        }
      } catch (error: any) {
        this.error =
          error?.message ||
          (this.isEnglish
            ? 'An error occurred while loading the diploma.'
            : 'حدث خطأ أثناء تحميل الدبلومة.');
      } finally {
        this.loading = false;
      }
    });
  }

  selectPlan(plan: DiplomaPricingPlan): void {
    this.selectedPlanId = this.resolvePlanId(plan);
  }

  isPlanSelected(plan: DiplomaPricingPlan): boolean {
    return this.resolvePlanId(plan) === this.selectedPlanId;
  }

  addToCart(): void {
    if (!this.diploma || !this.selectedPlan || !this.auth.currentUser) {
      return;
    }

    this.cartSvc.addDiploma(this.diploma, this.selectedPlan);
    window.alert(this.isEnglish ? 'Added to cart' : 'تمت الإضافة إلى السلة');
  }

  buyNow(): void {
    if (!this.diploma || !this.selectedPlan) {
      return;
    }

    if (!this.auth.currentUser) {
      this.goToPurchase();
      return;
    }

    this.cartSvc.addDiploma(this.diploma, this.selectedPlan);
    this.router.navigate(['/cart'], {
      queryParams: { buyNow: 1, itemType: 'diploma', itemId: this.diploma.id },
    });
  }

  goToPurchase(): void {
    const returnUrl = `${window.location.pathname}${window.location.search}`;
    this.router.navigate(['/login'], {
      queryParams: { redirect: returnUrl },
    });
  }

  openCourseDetails(courseId: string): void {
    if (!courseId) return;
    this.router.navigate(['/courses', courseId]);
  }

  planTrackBy = (index: number, plan: DiplomaPricingPlan): string => {
    return this.resolvePlanId(plan) || `${index}`;
  };

  trackByIndex = (index: number): number => {
    return index;
  };

  private getFeaturedPlan(): DiplomaPricingPlan | null {
    return this.pricingPlans.find((plan) => !!plan.highlighted) || null;
  }

  private resolvePlanId(plan: DiplomaPricingPlan): string {
    const rawId = `${plan?.id || ''}`.trim();
    if (rawId) {
      return this.slugify(rawId);
    }

    return this.slugify(`${plan?.name || ''}`) || 'plan';
  }

  private slugify(value: string): string {
    return `${value || ''}`
      .trim()
      .toLowerCase()
      .replace(/[٠-٩]/g, (digit) => '٠١٢٣٤٥٦٧٨٩'.indexOf(digit).toString())
      .replace(/[^\u0621-\u064Aa-z0-9-_]+/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }
}