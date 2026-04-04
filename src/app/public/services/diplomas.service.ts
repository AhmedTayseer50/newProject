import { Injectable, inject } from '@angular/core';
import { Database, objectVal, ref } from '@angular/fire/database';
import { map, Observable } from 'rxjs';
import {
  Diploma,
  DiplomaBottomCta,
  DiplomaCurriculumItem,
  DiplomaLang,
  DiplomaMeta,
  DiplomaMetaItem,
  DiplomaOffer,
  DiplomaPricingPlan,
  DiplomaSectionCard,
  DiplomaTestimonial,
} from 'src/app/shared/models/diploma.model';

type LocalizedText = string | { ar?: string; en?: string } | null | undefined;
type LocalizedStringList =
  | string[]
  | { ar?: string[]; en?: string[] }
  | null
  | undefined;

type RawDiplomaPricingPlan = {
  id?: string | number;
  name?: LocalizedText;
  badge?: LocalizedText;
  priceText?: LocalizedText;
  note?: LocalizedText;
  highlighted?: boolean;
  features?: LocalizedStringList;
};

type RawDiplomaTestimonial = {
  name?: LocalizedText;
  tag?: LocalizedText;
  rating?: number | string;
  text?: LocalizedText;
};

type RawDiplomaCurriculumItem = {
  title?: LocalizedText;
  points?: LocalizedStringList;
};

type RawDiplomaSectionCard = {
  title?: LocalizedText;
  description?: LocalizedText;
};

type RawDiplomaFaq = {
  question?: LocalizedText;
  answer?: LocalizedText;
};

type RawDiplomaMetaItem = {
  label?: LocalizedText;
  value?: LocalizedText;
};

type RawDiploma = {
  title?: LocalizedText;
  description?: LocalizedText;
  price?: number;
  thumbnail?: string;
  categoryId?: LocalizedText;
  published?: boolean;
  createdAt?: number;

  courseIds?: Record<string, boolean>;

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
  meta?: RawDiplomaMetaItem[] | { totalCourses?: number; totalLessons?: number; level?: string };
  specs?: LocalizedStringList;
  outcomes?: LocalizedStringList;
  audienceItems?: LocalizedStringList;
  sectionCards?: RawDiplomaSectionCard[];
  curriculum?: RawDiplomaCurriculumItem[];
  faqs?: RawDiplomaFaq[];
  communityPerks?: LocalizedStringList;
  testimonials?: RawDiplomaTestimonial[];
  pricingPlans?: RawDiplomaPricingPlan[];
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
export class DiplomasService {
  private db = inject(Database);

  watchDiplomas(): Observable<Array<{ id: string } & Diploma>> {
    const r = ref(this.db, 'diplomas');
    return objectVal<Record<string, RawDiploma>>(r).pipe(
      map((obj) => {
        if (!obj) return [];
        return Object.entries(obj).map(([id, data]) =>
          this.normalizeDiploma(id, data),
        );
      }),
      map((list) => list.filter((x) => x.published === true)),
    );
  }

  async getDiplomaById(id: string): Promise<({ id: string } & Diploma) | null> {
    const { get } = await import('@angular/fire/database');
    const snap = await get(ref(this.db, `diplomas/${id}`));
    return snap.exists()
      ? this.normalizeDiploma(id, snap.val() as RawDiploma)
      : null;
  }

  private normalizeDiploma(id: string, raw: RawDiploma): { id: string } & Diploma {
    const lang = this.detectLang();

    const metaItems: DiplomaMetaItem[] = Array.isArray(raw.meta)
      ? raw.meta
          .map((item) => ({
            label: this.pickText(item?.label, lang, ''),
            value: this.pickText(item?.value, lang, ''),
          }))
          .filter((item) => !!item.label || !!item.value)
      : [];

    const meta: DiplomaMeta = Array.isArray(raw.meta)
      ? {
          totalCourses: this.findMetaNumber(metaItems, ['عدد الكورسات', 'Total courses']),
          totalLessons: this.findMetaNumber(metaItems, ['عدد الدروس', 'Total lessons']),
          level: this.findMetaText(metaItems, ['المستوى', 'Level']),
        }
      : {
          totalCourses:
            typeof raw.meta?.totalCourses === 'number' ? raw.meta.totalCourses : undefined,
          totalLessons:
            typeof raw.meta?.totalLessons === 'number' ? raw.meta.totalLessons : undefined,
          level: raw.meta?.level || undefined,
        };

    const pricingPlans: DiplomaPricingPlan[] = (
      Array.isArray(raw.pricingPlans) ? raw.pricingPlans : []
    )
      .map((plan) => ({
        id: plan?.id != null ? String(plan.id) : undefined,
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

    const testimonials: DiplomaTestimonial[] = (
      Array.isArray(raw.testimonials) ? raw.testimonials : []
    )
      .map((item) => ({
        name: this.pickText(item?.name, lang, ''),
        tag: this.pickText(item?.tag, lang, ''),
        rating: Number(item?.rating || 0) || 0,
        text: this.pickText(item?.text, lang, ''),
      }))
      .filter((item) => !!item.name || !!item.text);

    const curriculum: DiplomaCurriculumItem[] = (
      Array.isArray(raw.curriculum) ? raw.curriculum : []
    )
      .map((item) => ({
        title: this.pickText(item?.title, lang, ''),
        points: this.pickList(item?.points, lang),
      }))
      .filter((item) => !!item.title || item.points.length > 0);

    const sectionCards: DiplomaSectionCard[] = (
      Array.isArray(raw.sectionCards) ? raw.sectionCards : []
    )
      .map((card) => ({
        title: this.pickText(card?.title, lang, ''),
        description: this.pickText(card?.description, lang, ''),
      }))
      .filter((card) => !!card.title || !!card.description);

    const offer: DiplomaOffer | undefined = raw.offer
      ? {
          percent: Number(raw.offer.percent || 0) || undefined,
          heading: this.pickText(raw.offer.heading, lang, ''),
          text: this.pickText(raw.offer.text, lang, ''),
          ctaText: this.pickText(raw.offer.ctaText, lang, ''),
        }
      : undefined;

    const bottomCta: DiplomaBottomCta | undefined = raw.bottomCta
      ? {
          text: this.pickText(raw.bottomCta.text, lang, ''),
          buttonText: this.pickText(raw.bottomCta.buttonText, lang, ''),
        }
      : undefined;

    const selectedCourseIds =
      raw.courseIds && typeof raw.courseIds === 'object'
        ? Object.keys(raw.courseIds).reduce((acc, key) => {
            if (raw.courseIds?.[key]) acc[key] = true;
            return acc;
          }, {} as Record<string, boolean>)
        : {};

    const specs = this.pickList(raw.specs, lang);
    const outcomes = this.pickList(raw.outcomes, lang);

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

      courseIds: selectedCourseIds,

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
      metaItems,
      specs: specs.length ? specs : outcomes,
      outcomes,
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
      offer,
      bottomCta,
    };
  }

  private detectLang(): DiplomaLang {
    const seg = window.location.pathname.split('/')[1];
    return seg === 'en' ? 'en' : 'ar';
  }

  private pickText(
    value: LocalizedText,
    lang: DiplomaLang,
    fallback = '',
  ): string {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') {
      return (value[lang] || value.ar || value.en || fallback || '').trim();
    }
    return fallback;
  }

  private pickList(value: LocalizedStringList, lang: DiplomaLang): string[] {
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

  private findMetaNumber(
    items: DiplomaMetaItem[],
    labels: string[],
  ): number | undefined {
    const item = items.find((x) => labels.includes((x.label || '').trim()));
    if (!item) return undefined;
    const parsed = Number((item.value || '').trim());
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private findMetaText(items: DiplomaMetaItem[], labels: string[]): string | undefined {
    const item = items.find((x) => labels.includes((x.label || '').trim()));
    const value = (item?.value || '').trim();
    return value || undefined;
  }
}