import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminService, LocalizedStringList, LocalizedText } from '../services/admin.service';
import {
  AdminDiploma,
  AdminDiplomaBottomCta,
  AdminDiplomaCurriculumItem,
  AdminDiplomaFaq,
  AdminDiplomaMetaItem,
  AdminDiplomaOffer,
  AdminDiplomaPricingPlan,
  AdminDiplomaSectionCard,
  AdminDiplomaTestimonial,
  DiplomasAdminService,
} from '../services/diplomas-admin.service';

type CourseRow = {
  id: string;
  title?: LocalizedText;
  price?: number;
  published?: boolean;
};

type DiplomaRow = {
  id: string;
  title?: LocalizedText;
  published?: boolean;
  createdAt?: number;
};

@Component({
  selector: 'app-diploma-editor',
  templateUrl: './diploma-editor.component.html',
  styleUrls: ['./diploma-editor.component.css'],
})
export class DiplomaEditorComponent implements OnInit {
  loading = false;
  error?: string;
  diplomaId?: string;
  activeLang: 'ar' | 'en' = 'ar';

  courses: CourseRow[] = [];
  diplomas: DiplomaRow[] = [];

  data: AdminDiploma = this.buildDefaults();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private diplomasAdmin: DiplomasAdminService,
    private adminCourses: AdminService,
  ) {}

  async ngOnInit(): Promise<void> {
    this.loading = true;
    this.error = undefined;

    try {
      await this.loadReferenceData();

      const id = this.route.snapshot.paramMap.get('id');
      if (id) {
        this.diplomaId = id;
        const diploma = await this.diplomasAdmin.getDiploma(id);
        if (!diploma) throw new Error('الدبلومة غير موجودة');
        this.data = this.mergeWithDefaults(diploma);
      } else {
        this.data = this.buildDefaults();
      }

      this.ensureArrays();
      this.syncMetaFromCourses();
    } catch (e: any) {
      this.error = e?.message ?? 'تعذر التحميل';
    } finally {
      this.loading = false;
    }
  }

  setLang(lang: 'ar' | 'en'): void {
    this.activeLang = lang;
  }

  private async loadReferenceData(): Promise<void> {
    const [courses, diplomas] = await Promise.all([
      this.adminCourses.listCourses(),
      this.diplomasAdmin.listDiplomas(),
    ]);

    this.courses = courses;
    this.diplomas = diplomas.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  private buildDefaults(): AdminDiploma {
    return {
      title: this.lt(),
      description: this.lt(),
      price: 0,
      thumbnail: '',
      categoryId: this.lt(),
      published: true,

      courseIds: {},

      heroEyebrow: this.lt(),
      heroTagline: this.lt(),
      heroTitleHighlight: this.lt(),

      introVideoUrl: '',

      programDuration: this.lt(),
      targetAudience: this.lt(),
      goalTitle: this.lt(),
      goalDescription: this.lt(),
      expectedStudyTimeTitle: this.lt(),
      expectedStudyTimeDescription: this.lt(),
      prerequisitesTitle: this.lt(),
      prerequisitesDescription: this.lt(),

      lectureNames: this.ll(),
      meta: [this.metaItem(), this.metaItem()],
      outcomes: this.ll(),
      audienceItems: this.ll(),
      sectionCards: [this.sectionCard()],
      curriculum: [this.curriculumItem()],
      faqs: [this.faqItem()],
      communityPerks: this.ll(),
      testimonials: [this.testimonial(), this.testimonial(), this.testimonial()],
      pricingPlans: [this.pricingPlan(), this.pricingPlan(), this.pricingPlan()],

      offer: this.offer(),
      bottomCta: this.bottomCta(),
    };
  }

  private mergeWithDefaults(value: Partial<AdminDiploma>): AdminDiploma {
    const defaults = this.buildDefaults();

    return {
      ...defaults,
      ...value,
      title: this.normText(value.title),
      description: this.normText(value.description),
      categoryId: this.normText(value.categoryId),
      heroEyebrow: this.normText(value.heroEyebrow),
      heroTagline: this.normText(value.heroTagline),
      heroTitleHighlight: this.normText(value.heroTitleHighlight),
      programDuration: this.normText(value.programDuration),
      targetAudience: this.normText(value.targetAudience),
      goalTitle: this.normText(value.goalTitle),
      goalDescription: this.normText(value.goalDescription),
      expectedStudyTimeTitle: this.normText(value.expectedStudyTimeTitle),
      expectedStudyTimeDescription: this.normText(value.expectedStudyTimeDescription),
      prerequisitesTitle: this.normText(value.prerequisitesTitle),
      prerequisitesDescription: this.normText(value.prerequisitesDescription),

      lectureNames: this.normList(value.lectureNames),
      outcomes: this.normList(value.outcomes),
      audienceItems: this.normList(value.audienceItems),
      communityPerks: this.normList(value.communityPerks),

      meta: Array.isArray(value.meta) && value.meta.length
        ? value.meta.map((item) => ({
            label: this.normText(item?.label),
            value: this.normText(item?.value),
          }))
        : defaults.meta,

      sectionCards: Array.isArray(value.sectionCards) && value.sectionCards.length
        ? value.sectionCards.map((item) => ({
            title: this.normText(item?.title),
            description: this.normText(item?.description),
          }))
        : defaults.sectionCards,

      curriculum: Array.isArray(value.curriculum) && value.curriculum.length
        ? value.curriculum.map((item) => ({
            title: this.normText(item?.title),
            points: this.normList(item?.points),
          }))
        : defaults.curriculum,

      faqs: Array.isArray(value.faqs) && value.faqs.length
        ? value.faqs.map((item) => ({
            question: this.normText(item?.question),
            answer: this.normText(item?.answer),
          }))
        : defaults.faqs,

      testimonials: Array.isArray(value.testimonials) && value.testimonials.length
        ? value.testimonials.map((item) => ({
            name: this.normText(item?.name),
            tag: this.normText(item?.tag),
            rating: Number(item?.rating || 5) || 5,
            text: this.normText(item?.text),
          }))
        : defaults.testimonials,

      pricingPlans: Array.isArray(value.pricingPlans) && value.pricingPlans.length
        ? value.pricingPlans.map((item) => ({
            name: this.normText(item?.name),
            badge: this.normText(item?.badge),
            priceText: this.normText(item?.priceText),
            note: this.normText(item?.note),
            highlighted: !!item?.highlighted,
            features: this.normList(item?.features),
          }))
        : defaults.pricingPlans,

      offer: {
        percent: Number(value.offer?.percent || defaults.offer?.percent || 30),
        heading: this.normText(value.offer?.heading),
        text: this.normText(value.offer?.text),
        ctaText: this.normText(value.offer?.ctaText),
      },

      bottomCta: {
        text: this.normText(value.bottomCta?.text),
        buttonText: this.normText(value.bottomCta?.buttonText),
      },

      courseIds:
        value.courseIds && typeof value.courseIds === 'object'
          ? value.courseIds
          : {},
    };
  }

  private ensureArrays(): void {
    this.data.lectureNames = this.normList(this.data.lectureNames);
    this.data.outcomes = this.normList(this.data.outcomes);
    this.data.audienceItems = this.normList(this.data.audienceItems);
    this.data.communityPerks = this.normList(this.data.communityPerks);

    if (!Array.isArray(this.data.meta) || !this.data.meta.length) {
      this.data.meta = [this.metaItem()];
    }

    if (!Array.isArray(this.data.sectionCards) || !this.data.sectionCards.length) {
      this.data.sectionCards = [this.sectionCard()];
    }

    if (!Array.isArray(this.data.curriculum) || !this.data.curriculum.length) {
      this.data.curriculum = [this.curriculumItem()];
    }

    if (!Array.isArray(this.data.faqs) || !this.data.faqs.length) {
      this.data.faqs = [this.faqItem()];
    }

    if (!Array.isArray(this.data.testimonials) || !this.data.testimonials.length) {
      this.data.testimonials = [this.testimonial(), this.testimonial(), this.testimonial()];
    }

    if (!Array.isArray(this.data.pricingPlans) || !this.data.pricingPlans.length) {
      this.data.pricingPlans = [this.pricingPlan(), this.pricingPlan(), this.pricingPlan()];
    }
  }

  private syncMetaFromCourses(): void {
    const totalCourses = Object.keys(this.data.courseIds || {}).length;
    const totalCoursesIndex = this.findMetaIndex('عدد الكورسات', 'Total courses');
    if (totalCoursesIndex >= 0) {
      this.data.meta![totalCoursesIndex].value = {
        ar: String(totalCourses),
        en: String(totalCourses),
      };
    } else {
      this.data.meta = [
        ...(this.data.meta || []),
        {
          label: { ar: 'عدد الكورسات', en: 'Total courses' },
          value: { ar: String(totalCourses), en: String(totalCourses) },
        },
      ];
    }
  }

  toggleCourse(courseId: string, checked: boolean): void {
    this.data.courseIds = this.data.courseIds || {};
    if (checked) {
      this.data.courseIds[courseId] = true;
    } else {
      delete this.data.courseIds[courseId];
    }
    this.syncMetaFromCourses();
  }

  isSelected(courseId: string): boolean {
    return !!this.data.courseIds?.[courseId];
  }

  async editDiploma(id: string): Promise<void> {
    await this.router.navigate(['/admin/diploma-editor', id]);
  }

  trackByIndex(index: number): number {
    return index;
  }

  addListItem(
    key: 'lectureNames' | 'outcomes' | 'audienceItems' | 'communityPerks',
  ): void {
    const list = this.data[key] as LocalizedStringList | undefined;
    const normalized = this.normList(list);
    normalized.ar.push('');
    normalized.en.push('');
    (this.data as any)[key] = normalized;
  }

  removeListItem(
    key: 'lectureNames' | 'outcomes' | 'audienceItems' | 'communityPerks',
    index: number,
  ): void {
    const list = this.normList((this.data as any)[key]);
    list.ar = list.ar.filter((_, i) => i !== index);
    list.en = list.en.filter((_, i) => i !== index);
    (this.data as any)[key] = list;
  }

  addMetaItem(): void {
    this.data.meta = [...(this.data.meta || []), this.metaItem()];
  }

  removeMetaItem(index: number): void {
    this.data.meta = (this.data.meta || []).filter((_, i) => i !== index);
  }

  addSectionCard(): void {
    this.data.sectionCards = [...(this.data.sectionCards || []), this.sectionCard()];
  }

  removeSectionCard(index: number): void {
    this.data.sectionCards = (this.data.sectionCards || []).filter((_, i) => i !== index);
  }

  addCurriculumItem(): void {
    this.data.curriculum = [...(this.data.curriculum || []), this.curriculumItem()];
  }

  removeCurriculumItem(index: number): void {
    this.data.curriculum = (this.data.curriculum || []).filter((_, i) => i !== index);
  }

  addCurriculumPoint(itemIndex: number): void {
    const item = this.data.curriculum?.[itemIndex];
    if (!item) return;
    item.points = this.normList(item.points);
    item.points.ar.push('');
    item.points.en.push('');
  }

  removeCurriculumPoint(itemIndex: number, pointIndex: number): void {
    const item = this.data.curriculum?.[itemIndex];
    if (!item) return;
    item.points = this.normList(item.points);
    item.points.ar = item.points.ar.filter((_, i) => i !== pointIndex);
    item.points.en = item.points.en.filter((_, i) => i !== pointIndex);
  }

  addFaq(): void {
    this.data.faqs = [...(this.data.faqs || []), this.faqItem()];
  }

  removeFaq(index: number): void {
    this.data.faqs = (this.data.faqs || []).filter((_, i) => i !== index);
  }

  addTestimonial(): void {
    this.data.testimonials = [...(this.data.testimonials || []), this.testimonial()];
  }

  removeTestimonial(index: number): void {
    this.data.testimonials = (this.data.testimonials || []).filter((_, i) => i !== index);
  }

  addPricingPlan(): void {
    this.data.pricingPlans = [...(this.data.pricingPlans || []), this.pricingPlan()];
  }

  removePricingPlan(index: number): void {
    this.data.pricingPlans = (this.data.pricingPlans || []).filter((_, i) => i !== index);
  }

  addPricingFeature(planIndex: number): void {
    const plan = this.data.pricingPlans?.[planIndex];
    if (!plan) return;
    plan.features = this.normList(plan.features);
    plan.features.ar.push('');
    plan.features.en.push('');
  }

  removePricingFeature(planIndex: number, featureIndex: number): void {
    const plan = this.data.pricingPlans?.[planIndex];
    if (!plan) return;
    plan.features = this.normList(plan.features);
    plan.features.ar = plan.features.ar.filter((_, i) => i !== featureIndex);
    plan.features.en = plan.features.en.filter((_, i) => i !== featureIndex);
  }

  async save(): Promise<void> {
    this.error = undefined;
    this.loading = true;

    try {
      const arTitle = (this.data.title?.ar || '').trim();
      const enTitle = (this.data.title?.en || '').trim();

      if (!arTitle && !enTitle) {
        throw new Error('اكتب عنوان الدبلومة على الأقل بإحدى اللغتين');
      }

      const payload: AdminDiploma = {
        ...this.data,
        title: this.normText(this.data.title),
        description: this.normText(this.data.description),
        categoryId: this.normText(this.data.categoryId),
        heroEyebrow: this.normText(this.data.heroEyebrow),
        heroTagline: this.normText(this.data.heroTagline),
        heroTitleHighlight: this.normText(this.data.heroTitleHighlight),
        programDuration: this.normText(this.data.programDuration),
        targetAudience: this.normText(this.data.targetAudience),
        goalTitle: this.normText(this.data.goalTitle),
        goalDescription: this.normText(this.data.goalDescription),
        expectedStudyTimeTitle: this.normText(this.data.expectedStudyTimeTitle),
        expectedStudyTimeDescription: this.normText(this.data.expectedStudyTimeDescription),
        prerequisitesTitle: this.normText(this.data.prerequisitesTitle),
        prerequisitesDescription: this.normText(this.data.prerequisitesDescription),
        lectureNames: this.cleanList(this.data.lectureNames),
        outcomes: this.cleanList(this.data.outcomes),
        audienceItems: this.cleanList(this.data.audienceItems),
        communityPerks: this.cleanList(this.data.communityPerks),
        meta: (this.data.meta || [])
          .map((item) => ({
            label: this.normText(item.label),
            value: this.normText(item.value),
          }))
          .filter(
            (item) =>
              item.label.ar ||
              item.label.en ||
              item.value.ar ||
              item.value.en,
          ),
        sectionCards: (this.data.sectionCards || [])
          .map((item) => ({
            title: this.normText(item.title),
            description: this.normText(item.description),
          }))
          .filter(
            (item) =>
              item.title.ar ||
              item.title.en ||
              item.description.ar ||
              item.description.en,
          ),
        curriculum: (this.data.curriculum || [])
          .map((item) => ({
            title: this.normText(item.title),
            points: this.cleanList(item.points),
          }))
          .filter(
            (item) =>
              item.title.ar ||
              item.title.en ||
              item.points.ar.length ||
              item.points.en.length,
          ),
        faqs: (this.data.faqs || [])
          .map((item) => ({
            question: this.normText(item.question),
            answer: this.normText(item.answer),
          }))
          .filter(
            (item) =>
              item.question.ar ||
              item.question.en ||
              item.answer.ar ||
              item.answer.en,
          ),
        testimonials: (this.data.testimonials || [])
          .map((item) => ({
            name: this.normText(item.name),
            tag: this.normText(item.tag),
            rating: Number(item.rating || 5) || 5,
            text: this.normText(item.text),
          }))
          .filter(
            (item) =>
              item.name.ar ||
              item.name.en ||
              item.text.ar ||
              item.text.en,
          ),
        pricingPlans: (this.data.pricingPlans || [])
          .map((item) => ({
            name: this.normText(item.name),
            badge: this.normText(item.badge),
            priceText: this.normText(item.priceText),
            note: this.normText(item.note),
            highlighted: !!item.highlighted,
            features: this.cleanList(item.features),
          }))
          .filter(
            (item) =>
              item.name.ar ||
              item.name.en ||
              item.priceText.ar ||
              item.priceText.en ||
              item.features.ar.length ||
              item.features.en.length,
          ),
        offer: {
          percent: Number(this.data.offer?.percent || 0) || 30,
          heading: this.normText(this.data.offer?.heading),
          text: this.normText(this.data.offer?.text),
          ctaText: this.normText(this.data.offer?.ctaText),
        },
        bottomCta: {
          text: this.normText(this.data.bottomCta?.text),
          buttonText: this.normText(this.data.bottomCta?.buttonText),
        },
        courseIds: this.normalizeCourseIds(this.data.courseIds),
        thumbnail: (this.data.thumbnail || '').trim(),
        introVideoUrl: (this.data.introVideoUrl || '').trim(),
        price: Number(this.data.price || 0) || 0,
        published: !!this.data.published,
      };

      this.syncMetaFromCourses();

      if (this.diplomaId) {
        await this.diplomasAdmin.updateDiploma(this.diplomaId, payload);
      } else {
        const newId = await this.diplomasAdmin.createDiploma(payload);
        this.diplomaId = newId;
      }

      await this.loadReferenceData();
      await this.router.navigate(['/admin/diploma-editor', this.diplomaId]);
    } catch (e: any) {
      this.error = e?.message ?? 'تعذر الحفظ';
    } finally {
      this.loading = false;
    }
  }

  private findMetaIndex(arLabel: string, enLabel: string): number {
    return (this.data.meta || []).findIndex((item) => {
      const ar = (item.label?.ar || '').trim();
      const en = (item.label?.en || '').trim();
      return ar === arLabel || en === enLabel;
    });
  }

  private lt(): LocalizedText {
    return { ar: '', en: '' };
  }

  private ll(): LocalizedStringList {
    return { ar: [''], en: [''] };
  }

  private metaItem(): AdminDiplomaMetaItem {
    return { label: this.lt(), value: this.lt() };
  }

  private sectionCard(): AdminDiplomaSectionCard {
    return { title: this.lt(), description: this.lt() };
  }

  private curriculumItem(): AdminDiplomaCurriculumItem {
    return { title: this.lt(), points: this.ll() };
  }

  private faqItem(): AdminDiplomaFaq {
    return { question: this.lt(), answer: this.lt() };
  }

  private testimonial(): AdminDiplomaTestimonial {
    return { name: this.lt(), tag: this.lt(), rating: 5, text: this.lt() };
  }

  private pricingPlan(): AdminDiplomaPricingPlan {
    return {
      name: this.lt(),
      badge: this.lt(),
      priceText: this.lt(),
      note: this.lt(),
      highlighted: false,
      features: this.ll(),
    };
  }

  private offer(): AdminDiplomaOffer {
    return {
      percent: 30,
      heading: this.lt(),
      text: this.lt(),
      ctaText: this.lt(),
    };
  }

  private bottomCta(): AdminDiplomaBottomCta {
    return {
      text: this.lt(),
      buttonText: this.lt(),
    };
  }

  private normText(value?: Partial<LocalizedText> | null): LocalizedText {
    return {
      ar: (value?.ar || '').trim(),
      en: (value?.en || '').trim(),
    };
  }

  private normList(value?: Partial<LocalizedStringList> | null): LocalizedStringList {
    return {
      ar: Array.isArray(value?.ar) ? [...value!.ar] : [''],
      en: Array.isArray(value?.en) ? [...value!.en] : [''],
    };
  }

  private cleanList(value?: Partial<LocalizedStringList> | null): LocalizedStringList {
    return {
      ar: Array.isArray(value?.ar)
        ? value.ar.map((item) => `${item ?? ''}`.trim()).filter(Boolean)
        : [],
      en: Array.isArray(value?.en)
        ? value.en.map((item) => `${item ?? ''}`.trim()).filter(Boolean)
        : [],
    };
  }

  private normalizeCourseIds(value?: Record<string, boolean>): Record<string, boolean> {
    if (!value || typeof value !== 'object') return {};
    return Object.keys(value).reduce((acc, key) => {
      if (value[key]) acc[key] = true;
      return acc;
    }, {} as Record<string, boolean>);
  }

  getLocalizedTitle(value?: LocalizedText): string {
    return this.activeLang === 'en'
      ? value?.en || value?.ar || ''
      : value?.ar || value?.en || '';
  }
}