import { Injectable, inject } from '@angular/core';
import {
  Database,
  get,
  push,
  ref,
  remove,
  set,
  update,
} from '@angular/fire/database';

export type AdminDiplomaLang = 'ar' | 'en';
export type LocalizedText = { ar: string; en: string };
export type LocalizedStringList = { ar: string[]; en: string[] };

export interface AdminDiplomaMetaItem {
  label: LocalizedText;
  value: LocalizedText;
}

export interface AdminDiplomaSectionCard {
  title: LocalizedText;
  description: LocalizedText;
}

export interface AdminDiplomaCurriculumItem {
  title: LocalizedText;
  points: LocalizedStringList;
}

export interface AdminDiplomaFaq {
  question: LocalizedText;
  answer: LocalizedText;
}

export interface AdminDiplomaTestimonial {
  name: LocalizedText;
  tag: LocalizedText;
  rating?: number;
  text: LocalizedText;
}

export interface AdminDiplomaPricingPlan {
  name: LocalizedText;
  badge: LocalizedText;
  priceText: LocalizedText;
  note: LocalizedText;
  highlighted?: boolean;
  features: LocalizedStringList;
}

export interface AdminDiplomaOffer {
  percent?: number;
  heading: LocalizedText;
  text: LocalizedText;
  ctaText: LocalizedText;
}

export interface AdminDiplomaBottomCta {
  text: LocalizedText;
  buttonText: LocalizedText;
}

export interface AdminDiploma {
  title: LocalizedText;
  description: LocalizedText;
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
  meta?: AdminDiplomaMetaItem[];
  outcomes?: LocalizedStringList;
  audienceItems?: LocalizedStringList;
  sectionCards?: AdminDiplomaSectionCard[];
  curriculum?: AdminDiplomaCurriculumItem[];
  faqs?: AdminDiplomaFaq[];
  communityPerks?: LocalizedStringList;
  testimonials?: AdminDiplomaTestimonial[];
  pricingPlans?: AdminDiplomaPricingPlan[];
  offer?: AdminDiplomaOffer;
  bottomCta?: AdminDiplomaBottomCta;
}

@Injectable({ providedIn: 'root' })
export class DiplomasAdminService {
  private db = inject(Database);

  async listDiplomas(): Promise<Array<{ id: string } & AdminDiploma>> {
    const snap = await get(ref(this.db, 'diplomas'));
    if (!snap.exists()) return [];
    const obj = snap.val() as Record<string, AdminDiploma>;
    return Object.entries(obj).map(([id, data]) => ({ id, ...data }));
  }

  async getDiploma(
    id: string
  ): Promise<({ id: string } & AdminDiploma) | null> {
    const snap = await get(ref(this.db, `diplomas/${id}`));
    return snap.exists() ? { id, ...(snap.val() as AdminDiploma) } : null;
  }

  async createDiploma(
    data: AdminDiploma,
    opts?: { id?: string }
  ): Promise<string> {
    const now = Date.now();
    let id = opts?.id?.trim();

    const payload: AdminDiploma = {
      title: this.buildLocalizedText(data.title),
      description: this.buildLocalizedText(data.description),
      price: Number(data.price || 0) || 0,
      thumbnail: (data.thumbnail || '').trim(),
      categoryId: this.buildLocalizedText(data.categoryId),
      published: !!data.published,
      createdAt: now,

      courseIds: this.normalizeCourseIds(data.courseIds),

      heroEyebrow: this.buildLocalizedText(data.heroEyebrow),
      heroTagline: this.buildLocalizedText(data.heroTagline),
      heroTitleHighlight: this.buildLocalizedText(data.heroTitleHighlight),

      introVideoUrl: (data.introVideoUrl || '').trim(),

      programDuration: this.buildLocalizedText(data.programDuration),
      targetAudience: this.buildLocalizedText(data.targetAudience),
      expectedStudyTimeTitle: this.buildLocalizedText(
        data.expectedStudyTimeTitle
      ),
      expectedStudyTimeDescription: this.buildLocalizedText(
        data.expectedStudyTimeDescription
      ),
      prerequisitesTitle: this.buildLocalizedText(data.prerequisitesTitle),
      prerequisitesDescription: this.buildLocalizedText(
        data.prerequisitesDescription
      ),
      goalTitle: this.buildLocalizedText(data.goalTitle),
      goalDescription: this.buildLocalizedText(data.goalDescription),

      lectureNames: this.buildLocalizedList(data.lectureNames),
      meta: Array.isArray(data.meta)
        ? data.meta.map((item) => ({
            label: this.buildLocalizedText(item?.label),
            value: this.buildLocalizedText(item?.value),
          }))
        : [],
      outcomes: this.buildLocalizedList(data.outcomes),
      audienceItems: this.buildLocalizedList(data.audienceItems),
      sectionCards: Array.isArray(data.sectionCards)
        ? data.sectionCards.map((item) => ({
            title: this.buildLocalizedText(item?.title),
            description: this.buildLocalizedText(item?.description),
          }))
        : [],
      curriculum: Array.isArray(data.curriculum)
        ? data.curriculum.map((item) => ({
            title: this.buildLocalizedText(item?.title),
            points: this.buildLocalizedList(item?.points),
          }))
        : [],
      faqs: Array.isArray(data.faqs)
        ? data.faqs.map((item) => ({
            question: this.buildLocalizedText(item?.question),
            answer: this.buildLocalizedText(item?.answer),
          }))
        : [],
      communityPerks: this.buildLocalizedList(data.communityPerks),
      testimonials: Array.isArray(data.testimonials)
        ? data.testimonials.map((item) => ({
            name: this.buildLocalizedText(item?.name),
            tag: this.buildLocalizedText(item?.tag),
            rating: Number(item?.rating || 0) || 0,
            text: this.buildLocalizedText(item?.text),
          }))
        : [],
      pricingPlans: Array.isArray(data.pricingPlans)
        ? data.pricingPlans.map((item) => ({
            name: this.buildLocalizedText(item?.name),
            badge: this.buildLocalizedText(item?.badge),
            priceText: this.buildLocalizedText(item?.priceText),
            note: this.buildLocalizedText(item?.note),
            highlighted: !!item?.highlighted,
            features: this.buildLocalizedList(item?.features),
          }))
        : [],
      offer: data.offer
        ? {
            percent: Number(data.offer.percent || 0) || undefined,
            heading: this.buildLocalizedText(data.offer.heading),
            text: this.buildLocalizedText(data.offer.text),
            ctaText: this.buildLocalizedText(data.offer.ctaText),
          }
        : undefined,
      bottomCta: data.bottomCta
        ? {
            text: this.buildLocalizedText(data.bottomCta.text),
            buttonText: this.buildLocalizedText(data.bottomCta.buttonText),
          }
        : undefined,
    };

    if (id) {
      const existsSnap = await get(ref(this.db, `diplomas/${id}`));
      if (existsSnap.exists()) {
        throw new Error(`المعرّف "${id}" مستخدم بالفعل.`);
      }
      await set(ref(this.db, `diplomas/${id}`), payload);
      return id;
    }

    const listRef = ref(this.db, 'diplomas');
    const newRef = push(listRef);
    id = newRef.key!;
    await set(ref(this.db, `diplomas/${id}`), payload);
    return id;
  }

  async updateDiploma(
    id: string,
    data: Partial<AdminDiploma>
  ): Promise<void> {
    await update(ref(this.db, `diplomas/${id}`), this.normalizeDiplomaPayload(data));
  }

  async deleteDiploma(id: string): Promise<void> {
    await remove(ref(this.db, `diplomas/${id}`));
  }

  buildLocalizedText(value?: Partial<LocalizedText> | null): LocalizedText {
    return {
      ar: (value?.ar || '').trim(),
      en: (value?.en || '').trim(),
    };
  }

  buildLocalizedList(
    value?: Partial<LocalizedStringList> | null
  ): LocalizedStringList {
    const safeValue = value ?? {};
    const arSource = safeValue.ar;
    const enSource = safeValue.en;

    const ar = Array.isArray(arSource)
      ? arSource.map((item) => `${item ?? ''}`.trim()).filter(Boolean)
      : [];

    const en = Array.isArray(enSource)
      ? enSource.map((item) => `${item ?? ''}`.trim()).filter(Boolean)
      : [];

    return { ar, en };
  }

  private normalizeDiplomaPayload(
    data: Partial<AdminDiploma>
  ): Partial<AdminDiploma> {
    const payload: Partial<AdminDiploma> = {
      ...data,
      price: Number(data.price || 0) || 0,
      thumbnail: (data.thumbnail || '').trim(),
      introVideoUrl: (data.introVideoUrl || '').trim(),
      published: !!data.published,
      courseIds: this.normalizeCourseIds(data.courseIds),
    };

    if (data.title) payload.title = this.buildLocalizedText(data.title);
    if (data.description) {
      payload.description = this.buildLocalizedText(data.description);
    }
    if (data.categoryId) {
      payload.categoryId = this.buildLocalizedText(data.categoryId);
    }

    if (data.heroEyebrow) {
      payload.heroEyebrow = this.buildLocalizedText(data.heroEyebrow);
    }
    if (data.heroTagline) {
      payload.heroTagline = this.buildLocalizedText(data.heroTagline);
    }
    if (data.heroTitleHighlight) {
      payload.heroTitleHighlight = this.buildLocalizedText(data.heroTitleHighlight);
    }

    if (data.programDuration) {
      payload.programDuration = this.buildLocalizedText(data.programDuration);
    }
    if (data.targetAudience) {
      payload.targetAudience = this.buildLocalizedText(data.targetAudience);
    }
    if (data.expectedStudyTimeTitle) {
      payload.expectedStudyTimeTitle = this.buildLocalizedText(
        data.expectedStudyTimeTitle
      );
    }
    if (data.expectedStudyTimeDescription) {
      payload.expectedStudyTimeDescription = this.buildLocalizedText(
        data.expectedStudyTimeDescription
      );
    }
    if (data.prerequisitesTitle) {
      payload.prerequisitesTitle = this.buildLocalizedText(
        data.prerequisitesTitle
      );
    }
    if (data.prerequisitesDescription) {
      payload.prerequisitesDescription = this.buildLocalizedText(
        data.prerequisitesDescription
      );
    }
    if (data.goalTitle) {
      payload.goalTitle = this.buildLocalizedText(data.goalTitle);
    }
    if (data.goalDescription) {
      payload.goalDescription = this.buildLocalizedText(data.goalDescription);
    }

    if (data.lectureNames) {
      payload.lectureNames = this.buildLocalizedList(data.lectureNames);
    }
    if (data.outcomes) {
      payload.outcomes = this.buildLocalizedList(data.outcomes);
    }
    if (data.audienceItems) {
      payload.audienceItems = this.buildLocalizedList(data.audienceItems);
    }
    if (data.communityPerks) {
      payload.communityPerks = this.buildLocalizedList(data.communityPerks);
    }

    if (Array.isArray(data.meta)) {
      payload.meta = data.meta.map((item) => ({
        label: this.buildLocalizedText(item?.label),
        value: this.buildLocalizedText(item?.value),
      }));
    }

    if (Array.isArray(data.sectionCards)) {
      payload.sectionCards = data.sectionCards.map((item) => ({
        title: this.buildLocalizedText(item?.title),
        description: this.buildLocalizedText(item?.description),
      }));
    }

    if (Array.isArray(data.curriculum)) {
      payload.curriculum = data.curriculum.map((item) => ({
        title: this.buildLocalizedText(item?.title),
        points: this.buildLocalizedList(item?.points),
      }));
    }

    if (Array.isArray(data.faqs)) {
      payload.faqs = data.faqs.map((item) => ({
        question: this.buildLocalizedText(item?.question),
        answer: this.buildLocalizedText(item?.answer),
      }));
    }

    if (Array.isArray(data.testimonials)) {
      payload.testimonials = data.testimonials.map((item) => ({
        name: this.buildLocalizedText(item?.name),
        tag: this.buildLocalizedText(item?.tag),
        rating: Number(item?.rating || 0) || 0,
        text: this.buildLocalizedText(item?.text),
      }));
    }

    if (Array.isArray(data.pricingPlans)) {
      payload.pricingPlans = data.pricingPlans.map((item) => ({
        name: this.buildLocalizedText(item?.name),
        badge: this.buildLocalizedText(item?.badge),
        priceText: this.buildLocalizedText(item?.priceText),
        note: this.buildLocalizedText(item?.note),
        highlighted: !!item?.highlighted,
        features: this.buildLocalizedList(item?.features),
      }));
    }

    if (data.offer) {
      payload.offer = {
        percent: Number(data.offer.percent || 0) || undefined,
        heading: this.buildLocalizedText(data.offer.heading),
        text: this.buildLocalizedText(data.offer.text),
        ctaText: this.buildLocalizedText(data.offer.ctaText),
      };
    }

    if (data.bottomCta) {
      payload.bottomCta = {
        text: this.buildLocalizedText(data.bottomCta.text),
        buttonText: this.buildLocalizedText(data.bottomCta.buttonText),
      };
    }

    return payload;
  }

  private normalizeCourseIds(
    value?: Record<string, boolean>
  ): Record<string, boolean> {
    if (!value || typeof value !== 'object') return {};
    return Object.keys(value).reduce((acc, key) => {
      if (value[key]) acc[key] = true;
      return acc;
    }, {} as Record<string, boolean>);
  }
}