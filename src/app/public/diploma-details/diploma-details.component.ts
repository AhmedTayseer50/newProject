import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { DiplomasService } from '../services/diplomas.service';
import { CoursesService } from '../services/courses.service';
import {
  Diploma,
  DiplomaPricingPlan,
  DiplomaTestimonial,
} from 'src/app/shared/models/diploma.model';

import { WhatsAppService } from 'src/app/core/services/whatsapp.service';

@Component({
  selector: 'app-diploma-details',
  templateUrl: './diploma-details.component.html',
  styleUrls: ['./diploma-details.component.css'],
})
export class DiplomaDetailsComponent implements OnInit, OnDestroy {
  diplomaId!: string;
  diploma: (Diploma & { id: string }) | null = null;

  loading = true;
  error?: string;

  defaultThumbnail =
    'https://images.pexels.com/photos/4100423/pexels-photo-4100423.jpeg?auto=compress&cs=tinysrgb&w=800';

  introVideoSafeUrl: SafeResourceUrl | null = null;
  includedCourses: any[] = [];

  showOfferPopup = false;
  private offerShown = false;

  private destroyed$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private diplomasSvc: DiplomasService,
    private coursesSvc: CoursesService,
    private sanitizer: DomSanitizer,
    private wa: WhatsAppService
  ) {}

  get isEnglish(): boolean {
    return window.location.pathname.startsWith('/en');
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

  get heroEyebrowFallback(): string {
    return this.isEnglish ? 'A complete guided diploma path' : 'دبلومة متكاملة بمسار تدريجي';
  }

  get heroTaglineFallback(): string {
    return this.isEnglish
      ? 'A structured path that combines key courses in one diploma.'
      : 'مسار متدرج يجمع أهم الكورسات داخل دبلومة واحدة.';
  }

  get enrollDiplomaText(): string {
    return this.isEnglish ? 'Enroll in diploma now' : 'اشترك الآن في الدبلومة';
  }

  get goalLabel(): string {
    return this.isEnglish ? 'Goal of study' : 'الهدف من الدراسة';
  }

  get expectedStudyLabel(): string {
    return this.isEnglish ? 'Expected study duration' : 'المدة المتوقعة للدراسة';
  }

  get prerequisitesLabel(): string {
    return this.isEnglish ? 'Previous experience' : 'الخبرات السابقة';
  }

  get introVideoEyebrow(): string {
    return this.isEnglish ? 'Intro video' : 'فيديو تعريفي';
  }

  get introVideoTitle(): string {
    return this.isEnglish
      ? 'An introduction to the diploma and what you will gain'
      : 'مقدمة عن الدبلومة وما الذي ستحصل عليه';
  }

  get introVideoSubtitle(): string {
    return this.isEnglish
      ? 'Watch this short video to understand the diploma path and expected outcomes.'
      : 'شاهد هذا الفيديو لمعرفة تفاصيل الدبلومة والمسار والمخرجات المتوقعة.';
  }

  get introVideoFrameTitle(): string {
    return this.isEnglish ? 'Diploma intro video' : 'الفيديو التعريفي للدبلومة';
  }

  get specsEyebrow(): string {
    return this.isEnglish ? 'Diploma specs' : 'مواصفات الدبلومة';
  }

  get specsTitle(): string {
    return this.isEnglish ? 'Technical information before you enroll' : 'معلومات فنية تساعدك قبل الاشتراك';
  }

  get specsSubtitle(): string {
    return this.isEnglish ? 'Short details about learning style and content.' : 'تفاصيل مختصرة عن طريقة الدراسة والمحتوى.';
  }

  get noSpecsText(): string {
    return this.isEnglish ? 'No specs have been added yet.' : 'لا توجد مواصفات مضافة بعد.';
  }

  get contentEyebrow(): string {
    return this.isEnglish ? 'Diploma contents' : 'محتويات الدبلومة';
  }

  get contentTitle(): string {
    return this.isEnglish ? 'Courses included in this path' : 'الكورسات الموجودة داخل المسار';
  }

  get contentSubtitle(): string {
    return this.isEnglish
      ? 'This diploma is a group of related courses arranged in one structured path.'
      : 'هذه الدبلومة عبارة عن مجموعة كورسات مرتبة داخل مسار واحد.';
  }

  get courseDetailsText(): string {
    return this.isEnglish ? 'View course details' : 'عرض تفاصيل الكورس';
  }

  get noCoursesText(): string {
    return this.isEnglish ? 'No courses have been added to this diploma yet.' : 'لا توجد كورسات مضافة للدبلومة بعد.';
  }

  get perksEyebrow(): string {
    return this.isEnglish ? 'Extra benefits' : 'مميزات إضافية';
  }

  get perksTitle(): string {
    return this.isEnglish ? 'Follow-up, community, and subscriber perks' : 'متابعة + مجتمع + امتيازات للمشتركين';
  }

  get perksSubtitle(): string {
    return this.isEnglish ? 'Practical benefits that support you during and after the diploma.' : 'مزايا عملية تساعدك أثناء وبعد الدبلومة.';
  }

  get noPerksText(): string {
    return this.isEnglish ? 'No additional perks have been added yet.' : 'لا توجد مميزات إضافية مضافة بعد.';
  }

  get testimonialsEyebrow(): string {
    return this.isEnglish ? 'Learners feedback' : 'آراء المتدربين';
  }

  get testimonialsTitle(): string {
    return this.isEnglish ? 'What do subscribers say?' : 'ماذا يقول المشتركون؟';
  }

  get testimonialsSubtitle(): string {
    return this.isEnglish ? 'A few short testimonials from diploma learners.' : '3 آراء مختصرة من عملاء الدبلومة.';
  }

  get testimonialDefaultTag(): string {
    return this.isEnglish ? 'Learner' : 'متدرب';
  }

  get testimonialFooterLabel(): string {
    return this.isEnglish ? 'Real experience' : 'تجربة واقعية';
  }

  get pricingEyebrow(): string {
    return this.isEnglish ? 'Pricing plans' : 'خطط الاشتراك';
  }

  get pricingTitle(): string {
    return this.isEnglish ? 'Choose the plan that fits you' : 'اختر الخطة الأنسب لك';
  }

  get pricingSubtitle(): string {
    return this.isEnglish ? 'Clear and direct plans — choose what suits you and enroll now.' : 'خطط واضحة ومباشرة — اختر ما يناسبك ثم اشترك الآن.';
  }

  get mostSelectedText(): string {
    return this.isEnglish ? 'Most selected' : 'الأكثر اختيارًا';
  }

  get enrollNowText(): string {
    return this.isEnglish ? 'Enroll now' : 'اشترك الآن';
  }

  get limitedOfferText(): string {
    return this.isEnglish ? 'Limited time' : 'لفترة محدودة';
  }

  private onWindowScroll = () => {
    if (this.loading || this.error || !this.diploma) return;

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

        this.diplomaId = id;
        this.loading = true;
        this.error = undefined;

        this.diploma = null;
        this.includedCourses = [];
        this.introVideoSafeUrl = null;
        this.showOfferPopup = false;
        this.offerShown = false;

        window.removeEventListener('scroll', this.onWindowScroll);

        try {
          const d = await this.diplomasSvc.getDiplomaById(this.diplomaId);
          if (!d) {
            this.error = this.isEnglish ? 'Diploma not found' : 'الدبلومة غير موجودة';
            return;
          }

          this.diploma = this.withDefaults(d);

          const introUrl = this.diploma.introVideoUrl;
          this.introVideoSafeUrl = introUrl
            ? this.sanitizer.bypassSecurityTrustResourceUrl(introUrl)
            : null;

          const ids = Object.keys(this.diploma.courseIds || {});
          if (ids.length) {
            const list = await Promise.all(
              ids.map((cid) => this.coursesSvc.getCourseById(cid))
            );
            this.includedCourses = list.filter(Boolean);
          }

          window.addEventListener('scroll', this.onWindowScroll);
        } catch (e: any) {
          this.error =
            e?.message ??
            (this.isEnglish
              ? 'An error occurred while loading the diploma'
              : 'حدث خطأ أثناء تحميل الدبلومة');
        } finally {
          this.loading = false;
        }
      });
  }

  private withDefaults(d: any): Diploma & { id: string } {
    const totalCourses = Object.keys(d.courseIds || {}).length;

    const pricingPlans: DiplomaPricingPlan[] = (
      d.pricingPlans && Array.isArray(d.pricingPlans) && d.pricingPlans.length
        ? d.pricingPlans
        : [
            {
              name: this.isEnglish ? 'Basic plan' : 'الخطة الأساسية',
              badge: this.isEnglish ? 'A calm focused start' : 'لبداية هادئة ومركّزة',
              priceText: d.price ? `${d.price}` : '—',
              note: this.isEnglish ? 'One-time payment – instant access to content' : 'دفع لمرة واحدة – دخول فوري للمحتوى',
              features: this.isEnglish
                ? [
                    'Full access to diploma content.',
                    'Downloadable files and practical exercises.',
                  ]
                : [
                    'الوصول الكامل لمحتوى الدبلومة.',
                    'تحميل الملفات والتطبيقات العملية.',
                  ],
              highlighted: false,
            },
            {
              name: this.isEnglish ? 'Group follow-up plan' : 'خطة المتابعة الجماعية',
              badge: this.isEnglish ? 'For extra support and direct questions' : 'لمن يريد دعمًا أكبر وأسئلة مباشرة',
              priceText: '—',
              note: this.isEnglish ? 'Includes all basic plan benefits and more' : 'تشمل كل مزايا الخطة الأساسية وأكثر',
              features: this.isEnglish
                ? [
                    'All basic plan features.',
                    'Follow-up in a community group for questions and discussion.',
                  ]
                : [
                    'كل مزايا الخطة الأساسية.',
                    'متابعة داخل جروب للأسئلة والنقاش.',
                  ],
              highlighted: true,
            },
            {
              name: this.isEnglish ? 'Premium plan' : 'الخطة المميّزة',
              badge: this.isEnglish ? 'For a deeper support space' : 'لمن يحتاج مساحة أعمق',
              priceText: '—',
              note: this.isEnglish ? 'Extra perks for subscribers' : 'مميزات إضافية للمشتركين',
              features: this.isEnglish
                ? [
                    'All group plan features.',
                    'Discounts on private sessions.',
                  ]
                : [
                    'كل مزايا خطة المتابعة.',
                    'خصومات على الجلسات الفردية.',
                  ],
              highlighted: false,
            },
          ]
    ).slice(0, 3);

    while (pricingPlans.length < 3) {
      pricingPlans.push({
        name: '',
        priceText: '—',
        features: [],
        highlighted: false,
      } as DiplomaPricingPlan);
    }

    const testimonials: DiplomaTestimonial[] = (
      d.testimonials && Array.isArray(d.testimonials) && d.testimonials.length
        ? d.testimonials
        : [
            {
              name: this.isEnglish ? 'Asmaa' : 'أسماء',
              tag: this.isEnglish ? 'Learner' : 'متدربة',
              rating: 5,
              text: this.isEnglish
                ? 'A very helpful experience that helped me understand myself more deeply.'
                : 'تجربة مفيدة جدًا وساعدتني أفهم نفسي بشكل أعمق.',
            },
            {
              name: this.isEnglish ? 'Mohamed' : 'محمد',
              tag: this.isEnglish ? 'Subscriber' : 'مشترك',
              rating: 5,
              text: this.isEnglish
                ? 'The explanation is simple and organized, and the path is arranged very well.'
                : 'الشرح بسيط ومنظم… والمسار مترتب بطريقة ممتازة.',
            },
            {
              name: this.isEnglish ? 'Sara' : 'سارة',
              tag: this.isEnglish ? 'Learner' : 'متدربة',
              rating: 5,
              text: this.isEnglish
                ? 'The best part was the follow-up and groups. I felt real support.'
                : 'أفضل شيء كان المتابعة والجروبات.. حسّيت بدعم حقيقي.',
            },
          ]
    ).slice(0, 3);

    while (testimonials.length < 3) {
      testimonials.push({ name: '', text: '' } as DiplomaTestimonial);
    }

    const specs = Array.isArray(d.specs) ? d.specs : [];
    const communityPerks = Array.isArray(d.communityPerks)
      ? d.communityPerks
      : this.isEnglish
        ? [
            'WhatsApp group for questions and follow-up.',
            'Community space for discussion and shared experiences.',
            'Special prices on private sessions after purchasing the diploma.',
          ]
        : [
            'جروب واتساب للرد على الاستفسارات والمتابعة.',
            'مجتمع للنقاش وتبادل الخبرات.',
            'أسعار خاصة على الجلسات الفردية بعد شراء الدبلومة.',
          ];

    return {
      ...d,
      heroEyebrow: d.heroEyebrow || this.heroEyebrowFallback,
      heroTagline: d.heroTagline || this.heroTaglineFallback,
      programDuration: d.programDuration || '—',
      targetAudience: d.targetAudience || '—',

      goalTitle: d.goalTitle || (this.isEnglish ? 'Goal of study' : 'الهدف من الدراسة'),
      goalDescription:
        d.goalDescription ||
        (this.isEnglish
          ? 'Build deeper understanding and follow a practical step-by-step path.'
          : 'تكوين فهم أعمق وخطة عملية للتطبيق خطوة بخطوة.'),

      expectedStudyTimeTitle:
        d.expectedStudyTimeTitle || (this.isEnglish ? 'Expected study duration' : 'المدة المتوقعة للدراسة'),
      expectedStudyTimeDescription:
        d.expectedStudyTimeDescription ||
        (this.isEnglish
          ? 'A flexible schedule that fits your time — watching and practical application.'
          : 'جدول مرن يناسب وقتك — مشاهدة + تطبيق عملي.'),

      prerequisitesTitle:
        d.prerequisitesTitle || (this.isEnglish ? 'Required background' : 'الخبرات السابقة المطلوبة'),
      prerequisitesDescription:
        d.prerequisitesDescription ||
        (this.isEnglish
          ? 'No prior experience is required — consistency is what matters.'
          : 'لا يشترط خبرة مسبقة — المهم الاستمرارية.'),

      specs,
      communityPerks,
      pricingPlans,
      testimonials,

      offer: d.offer || {
        percent: 30,
        heading: this.isEnglish ? 'Special 30% discount offer' : 'عرض خاص بخصم 30٪',
        text: this.isEnglish
          ? 'Get a 30% discount when you enroll now and start your path inside the diploma.'
          : 'احصل على خصم 30٪ عند الاشتراك الآن وابدأ رحلتك داخل المسار.',
        ctaText: this.enrollNowText,
      },

      bottomCta: d.bottomCta || {
        text: this.isEnglish
          ? 'If you have not enrolled yet, do not miss the opportunity. Start now and take your first step with awareness.'
          : 'لو لسه مشتركتش… متضيعش الفرصة. ابدأ الآن وخد أول خطوة بوعي.',
        buttonText: this.enrollNowText,
      },

      meta: {
        ...(d.meta || {}),
        totalCourses: d.meta?.totalCourses ?? totalCourses,
      },
    };
  }

  goToPurchase(): void {
    const diplomaTitle =
      (this.diploma?.title || '').trim() ||
      (this.isEnglish ? 'Untitled diploma' : 'بدون اسم');

    this.wa.open(
      this.isEnglish
        ? `I would like to enroll in the diploma: ${diplomaTitle}`
        : `أريد الاشتراك في الدبلومة: ${diplomaTitle}`
    );
  }

  closeOffer(): void {
    this.showOfferPopup = false;
  }

  onOfferBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closeOffer();
  }

  onOfferSubscribe(): void {
    this.closeOffer();
    this.goToPurchase();
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.onWindowScroll);
    this.destroyed$.next();
    this.destroyed$.complete();
  }
}