import { Injectable, inject } from '@angular/core';
import { Database } from '@angular/fire/database';
import { ref, get, onValue, off } from 'firebase/database';
import { Observable } from 'rxjs';
import {
  Course,
  CourseBottomCta,
  CourseCurriculumItem,
  CourseLang,
  CourseMetaItem,
  CourseOffer,
  CoursePricingPlan,
  CourseSectionCard,
  CourseTestimonial,
} from 'src/app/shared/models/course.model';

type LocalizedText = string | { ar?: string; en?: string } | null | undefined;
type LocalizedStringList =
  | string[]
  | { ar?: string[]; en?: string[] }
  | null
  | undefined;

type RawCoursePricingPlan = {
  id?: string | number;
  name?: LocalizedText;
  badge?: LocalizedText;
  priceText?: LocalizedText;
  note?: LocalizedText;
  highlighted?: boolean;
  features?: LocalizedStringList;
};

type RawCourseTestimonial = {
  name?: LocalizedText;
  tag?: LocalizedText;
  rating?: number | string;
  text?: LocalizedText;
};

type RawCourseCurriculumItem = {
  title?: LocalizedText;
  points?: LocalizedStringList;
};

type RawCourseSectionCard = {
  title?: LocalizedText;
  description?: LocalizedText;
};

type RawCourseFaq = {
  question?: LocalizedText;
  answer?: LocalizedText;
};

type RawCourse = {
  title?: LocalizedText;
  description?: LocalizedText;
  price?: number;
  thumbnail?: string;
  categoryId?: LocalizedText;
  published?: boolean;
  createdAt?: number;

  heroEyebrow?: LocalizedText;
  heroTagline?: LocalizedText;
  heroTitleHighlight?: LocalizedText;

  introVideoUrl?: string;

  programDuration?: LocalizedText;
  targetAudience?: LocalizedText;
  expectedStudyTimeTitle?: LocalizedText;
  expectedStudyTimeDescription?: LocalizedText;
  prerequisitesTitle?: LocalizedText;
  prerequisitesDescription?: LocalizedText;
  goalTitle?: LocalizedText;
  goalDescription?: LocalizedText;

  lectureNames?: LocalizedStringList;
  meta?: Array<{ label?: LocalizedText; value?: LocalizedText }>;
  outcomes?: LocalizedStringList;
  audienceItems?: LocalizedStringList;
  sectionCards?: RawCourseSectionCard[];
  curriculum?: RawCourseCurriculumItem[];
  faqs?: RawCourseFaq[];
  communityPerks?: LocalizedStringList;
  testimonials?: RawCourseTestimonial[];
  pricingPlans?: RawCoursePricingPlan[];
  offer?: {
    percent?: number;
    heading?: LocalizedText;
    text?: LocalizedText;
    ctaText?: LocalizedText;
  };
  bottomCta?: {
    text?: LocalizedText;
    buttonText?: LocalizedText;
  };
};

@Injectable({ providedIn: 'root' })
export class CoursesService {
  private db = inject(Database);

  async getCoursesOnce(): Promise<Course[]> {
    const snapshot = await get(ref(this.db, 'courses'));
    if (!snapshot.exists()) return [];
    const obj = snapshot.val() as Record<string, RawCourse>;
    return Object.entries(obj).map(([id, data]) =>
      this.normalizeCourse(id, data),
    );
  }

  async getCourseById(id: string): Promise<Course | null> {
    const snap = await get(ref(this.db, `courses/${id}`));
    return snap.exists() ? this.normalizeCourse(id, snap.val() as RawCourse) : null;
  }

  watchCourses(): Observable<Course[]> {
    return new Observable<Course[]>((subscriber) => {
      const r = ref(this.db, 'courses');
      const unsubscribe = onValue(
        r,
        (snap) => {
          if (!snap.exists()) {
            subscriber.next([]);
            return;
          }
          const obj = snap.val() as Record<string, RawCourse>;
          const list = Object.entries(obj).map(([id, data]) =>
            this.normalizeCourse(id, data),
          );
          subscriber.next(list);
        },
        (error) => subscriber.error(error),
      );

      return () => {
        unsubscribe();
        off(r);
      };
    });
  }

  private normalizeCourse(id: string, raw: RawCourse): Course {
    const lang = this.detectLang();

    const pricingPlans: CoursePricingPlan[] = (
      Array.isArray(raw.pricingPlans) ? raw.pricingPlans : []
    )
      .map((plan, index) => ({
        id: this.buildPricingPlanId(index, this.pickText(plan?.name, lang, ''), plan?.id),
        name: this.pickText(plan?.name, lang, ''),
        badge: this.pickText(plan?.badge, lang, ''),
        priceText: this.pickText(plan?.priceText, lang, ''),
        note: this.pickText(plan?.note, lang, ''),
        highlighted: !!plan?.highlighted,
        features: this.pickList(plan?.features, lang),
      }))
      .filter(
        (plan) => !!plan.name || !!plan.priceText || plan.features.length > 0,
      );

    const testimonials: CourseTestimonial[] = (
      Array.isArray(raw.testimonials) ? raw.testimonials : []
    )
      .map((item) => ({
        name: this.pickText(item?.name, lang, ''),
        tag: this.pickText(item?.tag, lang, ''),
        rating: Number(item?.rating || 0) || 0,
        text: this.pickText(item?.text, lang, ''),
      }))
      .filter((item) => !!item.name || !!item.text);

    const curriculum: CourseCurriculumItem[] = (
      Array.isArray(raw.curriculum) ? raw.curriculum : []
    )
      .map((item) => ({
        title: this.pickText(item?.title, lang, ''),
        points: this.pickList(item?.points, lang),
      }))
      .filter((item) => !!item.title || item.points.length > 0);

    const sectionCards: CourseSectionCard[] = (
      Array.isArray(raw.sectionCards) ? raw.sectionCards : []
    )
      .map((card) => ({
        title: this.pickText(card?.title, lang, ''),
        description: this.pickText(card?.description, lang, ''),
      }))
      .filter((card) => !!card.title || !!card.description);

    const meta: CourseMetaItem[] = (Array.isArray(raw.meta) ? raw.meta : [])
      .map((item) => ({
        label: this.pickText(item?.label, lang, ''),
        value: this.pickText(item?.value, lang, ''),
      }))
      .filter((item) => !!item.label || !!item.value);

    const offer: CourseOffer | undefined = raw.offer
      ? {
          percent: Number(raw.offer.percent || 0) || undefined,
          heading: this.pickText(raw.offer.heading, lang, ''),
          text: this.pickText(raw.offer.text, lang, ''),
          ctaText: this.pickText(raw.offer.ctaText, lang, ''),
        }
      : undefined;

    const bottomCta: CourseBottomCta | undefined = raw.bottomCta
      ? {
          text: this.pickText(raw.bottomCta.text, lang, ''),
          buttonText: this.pickText(raw.bottomCta.buttonText, lang, ''),
        }
      : undefined;

    const featuredPlan = this.pickFeaturedPlan(pricingPlans);
    const displayPriceText = this.pickDisplayPriceText(featuredPlan, raw.price);

    return {
      id,
      lang,
      title: this.pickText(raw.title, lang, ''),
      description: this.pickText(raw.description, lang, ''),
      price: Number(raw.price || 0) || 0,
      thumbnail: raw.thumbnail || '',
      categoryId: this.pickText(raw.categoryId, lang, ''),
      published: !!raw.published,
      createdAt: raw.createdAt,

      heroEyebrow: this.pickText(raw.heroEyebrow, lang, ''),
      heroTagline: this.pickText(raw.heroTagline, lang, ''),
      heroTitleHighlight: this.pickText(raw.heroTitleHighlight, lang, ''),

      introVideoUrl: raw.introVideoUrl || '',

      programDuration: this.pickText(raw.programDuration, lang, ''),
      targetAudience: this.pickText(raw.targetAudience, lang, ''),
      expectedStudyTimeTitle: this.pickText(raw.expectedStudyTimeTitle, lang, ''),
      expectedStudyTimeDescription: this.pickText(
        raw.expectedStudyTimeDescription,
        lang,
        '',
      ),
      prerequisitesTitle: this.pickText(raw.prerequisitesTitle, lang, ''),
      prerequisitesDescription: this.pickText(
        raw.prerequisitesDescription,
        lang,
        '',
      ),
      goalTitle: this.pickText(raw.goalTitle, lang, ''),
      goalDescription: this.pickText(raw.goalDescription, lang, ''),

      lectureNames: this.pickList(raw.lectureNames, lang),
      meta,
      outcomes: this.pickList(raw.outcomes, lang),
      audienceItems: this.pickList(raw.audienceItems, lang),
      sectionCards,
      curriculum,
      faqs: (Array.isArray(raw.faqs) ? raw.faqs : [])
        .map((item) => ({
          question: this.pickText(item?.question, lang, ''),
          answer: this.pickText(item?.answer, lang, ''),
        }))
        .filter((item) => !!item.question || !!item.answer),
      communityPerks: this.pickList(raw.communityPerks, lang),
      testimonials,
      pricingPlans,
      featuredPlan,
      displayPriceText,
      offer,
      bottomCta,
    };
  }


  private pickFeaturedPlan(pricingPlans: CoursePricingPlan[]): CoursePricingPlan | null {
    if (!pricingPlans.length) return null;
    return pricingPlans.find((plan) => !!plan.highlighted) || pricingPlans[0] || null;
  }

  private pickDisplayPriceText(featuredPlan: CoursePricingPlan | null, fallbackPrice?: number): string {
    const featuredPrice = `${featuredPlan?.priceText || ''}`.trim();
    if (featuredPrice) return featuredPrice;
    const numeric = Number(fallbackPrice || 0);
    return numeric > 0 ? `${numeric} EGP` : '';
  }

  private buildPricingPlanId(index: number, name: string, rawId?: string | number): string {
    const directId = this.normalizePricingPlanId(rawId);
    if (directId) {
      return directId;
    }

    const fromName = this.normalizePricingPlanId(name);
    if (fromName && !/^\d+$/.test(fromName)) {
      return fromName;
    }

    return `plan-${index + 1}`;
  }

  private normalizePricingPlanId(value: string | number | null | undefined): string {
    return `${value ?? ''}`
      .trim()
      .toLowerCase()
      .replace(/[٠-٩]/g, (digit) => '٠١٢٣٤٥٦٧٨٩'.indexOf(digit).toString())
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private detectLang(): CourseLang {
    const seg = window.location.pathname.split('/')[1];
    return seg === 'en' ? 'en' : 'ar';
  }

  private pickText(
    value: LocalizedText,
    lang: CourseLang,
    fallback = '',
  ): string {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') {
      return (value[lang] || value.ar || value.en || fallback || '').trim();
    }
    return fallback;
  }

  private pickList(value: LocalizedStringList, lang: CourseLang): string[] {
    if (Array.isArray(value)) {
      return value.map((item) => `${item ?? ''}`.trim()).filter(Boolean);
    }

    if (value && typeof value === 'object') {
      const list = value[lang] || value.ar || value.en || [];
      return Array.isArray(list)
        ? list.map((item) => `${item ?? ''}`.trim()).filter(Boolean)
        : [];
    }

    return [];
  }
}