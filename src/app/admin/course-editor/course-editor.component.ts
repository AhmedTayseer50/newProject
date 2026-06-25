import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import {
  AdminCourse,
  AdminCourseBottomCta,
  AdminCourseCurriculumItem,
  AdminCourseFaq,
  AdminCourseMetaItem,
  AdminCourseOffer,
  AdminCoursePricingPlan,
  AdminCourseSectionCard,
  AdminCourseTestimonial,
  AdminLang,
  AdminLesson,
  AdminService,
  LocalizedStringList,
  LocalizedText,
} from '../services/admin.service';

type CourseRow = {
  id: string;
  title?: LocalizedText;
  price?: number;
  published?: boolean;
  categoryId?: LocalizedText;
};

type LessonRow = {
  id: string;
  title: string;
  lessonIndex: number;
  videoProvider?: 'youtube' | 'gdrive';
  videoRef?: string;
  pdfDriveFileId?: string;
  pdfTitle?: string;
};

type LangTextGroup = FormGroup<{
  ar: FormControl<string>;
  en: FormControl<string>;
}>;

type LangListGroup = FormGroup<{
  ar: FormControl<string>;
  en: FormControl<string>;
}>;

type ParsedLocalizedLandingPage = {
  title?: string;
  description?: string;
  heroEyebrow?: string;
  heroTagline?: string;
  heroTitleHighlight?: string;
  categoryId?: string;
  thumbnail?: string;
  price?: number;
  meta: { label: string; value: string }[];
  goalTitle?: string;
  goalDescription?: string;
  outcomes: string[];
  curriculum: { title: string; points: string[] }[];
  programDuration?: string;
  targetAudience?: string;
  expectedStudyTimeTitle?: string;
  expectedStudyTimeDescription?: string;
  audienceItems: string[];
  prerequisitesTitle?: string;
  prerequisitesDescription?: string;
  sectionCards: { title: string; description: string }[];
  pricingPlans: {
    name: string;
    badge: string;
    note: string;
    features: string[];
  }[];
  communityPerks: string[];
  bottomCtaText?: string;
  bottomCtaButtonText?: string;
  offerPercent?: number;
  offerHeading?: string;
  offerText?: string;
  offerCtaText?: string;
};

type ParsedLandingPage = {
  ar: ParsedLocalizedLandingPage;
  en: ParsedLocalizedLandingPage;
};

@Component({
  selector: 'app-course-editor',
  templateUrl: './course-editor.component.html',
  styleUrls: ['./course-editor.component.css'],
})
export class CourseEditorComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private admin: AdminService,
  ) {}

  courseId?: string;
  loading = true;
  error?: string;
  activeLang: AdminLang = 'ar';
  bulkLandingPageControl = this.fb.nonNullable.control('');
  bulkImportMessage?: string;
  bulkImportError?: string;

  courses: CourseRow[] = [];
  lessons: LessonRow[] = [];

  courseForm!: FormGroup<{
    title: LangTextGroup;
    description: LangTextGroup;
    price: FormControl<number>;
    thumbnail: FormControl<string>;
    categoryId: LangTextGroup;
    published: FormControl<boolean>;

    heroEyebrow: LangTextGroup;
    heroTagline: LangTextGroup;
    heroTitleHighlight: LangTextGroup;

    introVideoUrl: FormControl<string>;
    telegramInviteUrl: FormControl<string>;

    programDuration: LangTextGroup;
    targetAudience: LangTextGroup;
    goalTitle: LangTextGroup;
    goalDescription: LangTextGroup;
    expectedStudyTimeTitle: LangTextGroup;
    expectedStudyTimeDescription: LangTextGroup;
    prerequisitesTitle: LangTextGroup;
    prerequisitesDescription: LangTextGroup;

    lectureNames: FormArray<LangTextGroup>;
    meta: FormArray<FormGroup<{ label: LangTextGroup; value: LangTextGroup }>>;
    outcomes: FormArray<LangTextGroup>;
    audienceItems: FormArray<LangTextGroup>;
    sectionCards: FormArray<
      FormGroup<{ title: LangTextGroup; description: LangTextGroup }>
    >;
    curriculum: FormArray<
      FormGroup<{
        title: LangTextGroup;
        pointsAr: FormControl<string>;
        pointsEn: FormControl<string>;
      }>
    >;
    faqs: FormArray<
      FormGroup<{ question: LangTextGroup; answer: LangTextGroup }>
    >;
    communityPerks: FormArray<LangTextGroup>;
    testimonials: FormArray<
      FormGroup<{
        name: LangTextGroup;
        tag: LangTextGroup;
        rating: FormControl<number>;
        text: LangTextGroup;
      }>
    >;
    pricingPlans: FormArray<
      FormGroup<{
        name: LangTextGroup;
        badge: LangTextGroup;
        priceBeforeOfferText: LangTextGroup;
        priceText: LangTextGroup;
        note: LangTextGroup;
        highlighted: FormControl<boolean>;
        hideStudyMaterial: FormControl<boolean>;
        featuresAr: FormControl<string>;
        featuresEn: FormControl<string>;
      }>
    >;

    offerPercent: FormControl<number>;
    offerHeading: LangTextGroup;
    offerText: LangTextGroup;
    offerCtaText: LangTextGroup;

    bottomCtaText: LangTextGroup;
    bottomCtaButtonText: LangTextGroup;
  }>;

  lessonForm!: FormGroup<{
    id: FormControl<string | null>;
    title: FormControl<string>;
    lessonIndex: FormControl<number>;
    videoProvider: FormControl<'youtube' | 'gdrive'>;
    videoRef: FormControl<string>;
    pdfDriveFileId: FormControl<string>;
    pdfTitle: FormControl<string>;
  }>;

  ngOnInit(): void {
    this.initForms();
    this.bootstrap();
  }

  setLang(lang: AdminLang): void {
    this.activeLang = lang;
  }

  private async bootstrap(): Promise<void> {
    this.courseId = this.route.snapshot.paramMap.get('id') || undefined;

    try {
      if (this.courseId) {
        const course = await this.admin.getCourse(this.courseId);
        if (!course) {
          throw new Error('الكورس غير موجود');
        }

        const coursePrivate = await this.admin.getCoursePrivate(this.courseId);

        this.patchCourseForm(course);
        this.courseForm.patchValue({
          telegramInviteUrl: coursePrivate.telegramInviteUrl || '',
        });

        await this.refreshLessons();
      } else {
        await this.loadCoursesList();
        if (!this.lectureNames.length) this.addLectureName();
      }
    } catch (e: any) {
      this.error = e?.message ?? 'حدث خطأ';
    } finally {
      this.loading = false;
    }
  }

  private initForms(): void {
    this.courseForm = this.fb.group({
      title: this.createLangTextGroup(true),
      description: this.createLangTextGroup(),
      price: this.fb.nonNullable.control(0, [Validators.min(0)]),
      thumbnail: this.fb.nonNullable.control(''),
      categoryId: this.createLangTextGroup(),
      published: this.fb.nonNullable.control(false),

      heroEyebrow: this.createLangTextGroup(),
      heroTagline: this.createLangTextGroup(),
      heroTitleHighlight: this.createLangTextGroup(),

      introVideoUrl: this.fb.nonNullable.control(''),
      telegramInviteUrl: this.fb.nonNullable.control(''),

      programDuration: this.createLangTextGroup(),
      targetAudience: this.createLangTextGroup(),
      goalTitle: this.createLangTextGroup(),
      goalDescription: this.createLangTextGroup(),
      expectedStudyTimeTitle: this.createLangTextGroup(),
      expectedStudyTimeDescription: this.createLangTextGroup(),
      prerequisitesTitle: this.createLangTextGroup(),
      prerequisitesDescription: this.createLangTextGroup(),

      lectureNames: this.fb.array<LangTextGroup>([]),
      meta: this.fb.array<
        FormGroup<{ label: LangTextGroup; value: LangTextGroup }>
      >([]),
      outcomes: this.fb.array<LangTextGroup>([]),
      audienceItems: this.fb.array<LangTextGroup>([]),
      sectionCards: this.fb.array<
        FormGroup<{ title: LangTextGroup; description: LangTextGroup }>
      >([]),
      curriculum: this.fb.array<
        FormGroup<{
          title: LangTextGroup;
          pointsAr: FormControl<string>;
          pointsEn: FormControl<string>;
        }>
      >([]),
      faqs: this.fb.array<
        FormGroup<{ question: LangTextGroup; answer: LangTextGroup }>
      >([]),
      communityPerks: this.fb.array<LangTextGroup>([]),
      testimonials: this.fb.array<
        FormGroup<{
          name: LangTextGroup;
          tag: LangTextGroup;
          rating: FormControl<number>;
          text: LangTextGroup;
        }>
      >([]),
      pricingPlans: this.fb.array<
        FormGroup<{
          name: LangTextGroup;
          badge: LangTextGroup;
          priceBeforeOfferText: LangTextGroup;
          priceText: LangTextGroup;
          note: LangTextGroup;
          highlighted: FormControl<boolean>;
          hideStudyMaterial: FormControl<boolean>;
          featuresAr: FormControl<string>;
          featuresEn: FormControl<string>;
        }>
      >([]),

      offerPercent: this.fb.nonNullable.control(0),
      offerHeading: this.createLangTextGroup(),
      offerText: this.createLangTextGroup(),
      offerCtaText: this.createLangTextGroup(),

      bottomCtaText: this.createLangTextGroup(),
      bottomCtaButtonText: this.createLangTextGroup(),
    });

    this.lessonForm = this.fb.group({
      id: this.fb.control<string | null>(null),
      title: this.fb.nonNullable.control(''),
      lessonIndex: this.fb.nonNullable.control(1),
      videoProvider: this.fb.nonNullable.control<'youtube' | 'gdrive'>(
        'youtube',
      ),
      videoRef: this.fb.nonNullable.control(''),
      pdfDriveFileId: this.fb.nonNullable.control(''),
      pdfTitle: this.fb.nonNullable.control(''),
    });

    this.addLectureName();
    this.addOutcome();
    this.addAudienceItem();
    this.addSectionCard();
    this.addCurriculumItem();
    this.addFaq();
    this.addCommunityPerk();
    this.addTestimonial();
    this.addPricingPlan();
    this.addMetaItem();
  }

  get lectureNames(): FormArray<LangTextGroup> {
    return this.courseForm.get('lectureNames') as FormArray<LangTextGroup>;
  }

  get meta(): FormArray<
    FormGroup<{ label: LangTextGroup; value: LangTextGroup }>
  > {
    return this.courseForm.get('meta') as FormArray<
      FormGroup<{ label: LangTextGroup; value: LangTextGroup }>
    >;
  }

  get outcomes(): FormArray<LangTextGroup> {
    return this.courseForm.get('outcomes') as FormArray<LangTextGroup>;
  }

  get audienceItems(): FormArray<LangTextGroup> {
    return this.courseForm.get('audienceItems') as FormArray<LangTextGroup>;
  }

  get sectionCards(): FormArray<
    FormGroup<{ title: LangTextGroup; description: LangTextGroup }>
  > {
    return this.courseForm.get('sectionCards') as FormArray<
      FormGroup<{ title: LangTextGroup; description: LangTextGroup }>
    >;
  }

  get curriculum(): FormArray<
    FormGroup<{
      title: LangTextGroup;
      pointsAr: FormControl<string>;
      pointsEn: FormControl<string>;
    }>
  > {
    return this.courseForm.get('curriculum') as FormArray<
      FormGroup<{
        title: LangTextGroup;
        pointsAr: FormControl<string>;
        pointsEn: FormControl<string>;
      }>
    >;
  }

  get faqs(): FormArray<
    FormGroup<{ question: LangTextGroup; answer: LangTextGroup }>
  > {
    return this.courseForm.get('faqs') as FormArray<
      FormGroup<{ question: LangTextGroup; answer: LangTextGroup }>
    >;
  }

  get communityPerks(): FormArray<LangTextGroup> {
    return this.courseForm.get('communityPerks') as FormArray<LangTextGroup>;
  }

  get testimonials(): FormArray<
    FormGroup<{
      name: LangTextGroup;
      tag: LangTextGroup;
      rating: FormControl<number>;
      text: LangTextGroup;
    }>
  > {
    return this.courseForm.get('testimonials') as FormArray<
      FormGroup<{
        name: LangTextGroup;
        tag: LangTextGroup;
        rating: FormControl<number>;
        text: LangTextGroup;
      }>
    >;
  }

  get pricingPlans(): FormArray<
    FormGroup<{
      name: LangTextGroup;
      badge: LangTextGroup;
      priceBeforeOfferText: LangTextGroup;
      priceText: LangTextGroup;
      note: LangTextGroup;
      highlighted: FormControl<boolean>;
      hideStudyMaterial: FormControl<boolean>;
      featuresAr: FormControl<string>;
      featuresEn: FormControl<string>;
    }>
  > {
    return this.courseForm.get('pricingPlans') as FormArray<
      FormGroup<{
        name: LangTextGroup;
        badge: LangTextGroup;
        priceBeforeOfferText: LangTextGroup;
        priceText: LangTextGroup;
        note: LangTextGroup;
        highlighted: FormControl<boolean>;
        hideStudyMaterial: FormControl<boolean>;
        featuresAr: FormControl<string>;
        featuresEn: FormControl<string>;
      }>
    >;
  }

  get publishReadinessIssues(): string[] {
    return [];
  }

  get canPublishCourse(): boolean {
    return true;
  }

  private createLangTextGroup(required = false): LangTextGroup {
    return this.fb.group({
      ar: this.fb.nonNullable.control(
        '',
        required ? [Validators.required, Validators.minLength(2)] : [],
      ),
      en: this.fb.nonNullable.control(''),
    });
  }

  private createLangTextValue(value?: Partial<LocalizedText>): LangTextGroup {
    return this.fb.group({
      ar: this.fb.nonNullable.control((value?.ar || '').trim()),
      en: this.fb.nonNullable.control((value?.en || '').trim()),
    });
  }

  private createListItem(value?: Partial<LocalizedText>): LangTextGroup {
    return this.createLangTextValue(value);
  }

  addLectureName(value?: Partial<LocalizedText>): void {
    this.lectureNames.push(this.createListItem(value));
  }

  removeLectureName(index: number): void {
    this.lectureNames.removeAt(index);
  }

  addMetaItem(value?: AdminCourseMetaItem): void {
    this.meta.push(
      this.fb.group({
        label: this.createLangTextValue(value?.label),
        value: this.createLangTextValue(value?.value),
      }),
    );
  }

  removeMetaItem(index: number): void {
    this.meta.removeAt(index);
  }

  addOutcome(value?: Partial<LocalizedText>): void {
    this.outcomes.push(this.createListItem(value));
  }

  removeOutcome(index: number): void {
    this.outcomes.removeAt(index);
  }

  addAudienceItem(value?: Partial<LocalizedText>): void {
    this.audienceItems.push(this.createListItem(value));
  }

  removeAudienceItem(index: number): void {
    this.audienceItems.removeAt(index);
  }

  addSectionCard(value?: AdminCourseSectionCard): void {
    this.sectionCards.push(
      this.fb.group({
        title: this.createLangTextValue(value?.title),
        description: this.createLangTextValue(value?.description),
      }),
    );
  }

  removeSectionCard(index: number): void {
    this.sectionCards.removeAt(index);
  }

  addCurriculumItem(value?: AdminCourseCurriculumItem): void {
    this.curriculum.push(
      this.fb.group({
        title: this.createLangTextValue(value?.title),
        pointsAr: this.fb.nonNullable.control(
          (value?.points?.ar || []).join('\n'),
        ),
        pointsEn: this.fb.nonNullable.control(
          (value?.points?.en || []).join('\n'),
        ),
      }),
    );
  }

  removeCurriculumItem(index: number): void {
    this.curriculum.removeAt(index);
  }

  addFaq(value?: AdminCourseFaq): void {
    this.faqs.push(
      this.fb.group({
        question: this.createLangTextValue(value?.question),
        answer: this.createLangTextValue(value?.answer),
      }),
    );
  }

  removeFaq(index: number): void {
    this.faqs.removeAt(index);
  }

  addCommunityPerk(value?: Partial<LocalizedText>): void {
    this.communityPerks.push(this.createListItem(value));
  }

  removeCommunityPerk(index: number): void {
    this.communityPerks.removeAt(index);
  }

  addTestimonial(value?: AdminCourseTestimonial): void {
    this.testimonials.push(
      this.fb.group({
        name: this.createLangTextValue(value?.name),
        tag: this.createLangTextValue(value?.tag),
        rating: this.fb.nonNullable.control(Number(value?.rating || 5)),
        text: this.createLangTextValue(value?.text),
      }),
    );
  }

  removeTestimonial(index: number): void {
    this.testimonials.removeAt(index);
  }

  addPricingPlan(value?: AdminCoursePricingPlan): void {
    this.pricingPlans.push(
      this.fb.group({
        name: this.createLangTextValue(value?.name),
        badge: this.createLangTextValue(value?.badge),
        priceBeforeOfferText: this.createLangTextValue(
          value?.priceBeforeOfferText,
        ),
        priceText: this.createLangTextValue(value?.priceText),
        note: this.createLangTextValue(value?.note),
        highlighted: this.fb.nonNullable.control(!!value?.highlighted),
        hideStudyMaterial: this.fb.nonNullable.control(
          !!value?.hideStudyMaterial,
        ),
        featuresAr: this.fb.nonNullable.control(
          (value?.features?.ar || []).join('\n'),
        ),
        featuresEn: this.fb.nonNullable.control(
          (value?.features?.en || []).join('\n'),
        ),
      }),
    );
  }

  removePricingPlan(index: number): void {
    this.pricingPlans.removeAt(index);
  }

  getCourseTitleForList(course: CourseRow): string {
    return course?.title?.ar || course?.title?.en || 'بدون عنوان';
  }

  async loadCoursesList(): Promise<void> {
    this.courses = (await this.admin.listCourses()).sort((a, b) =>
      this.getCourseTitleForList(a).localeCompare(
        this.getCourseTitleForList(b),
      ),
    );
  }

  private clearFormArray<T extends FormGroup | FormControl>(
    arr: FormArray<T>,
  ): void {
    while (arr.length) {
      arr.removeAt(0);
    }
  }

  private toLocalizedItems(list?: LocalizedStringList): LocalizedText[] {
    const ar = Array.isArray(list?.ar) ? list!.ar : [];
    const en = Array.isArray(list?.en) ? list!.en : [];
    const max = Math.max(ar.length, en.length);

    return Array.from({ length: max }, (_, index) => ({
      ar: (ar[index] || '').trim(),
      en: (en[index] || '').trim(),
    })).filter((item) => item.ar || item.en);
  }

  private patchCourseForm(course: { id: string } & AdminCourse): void {
    this.courseForm.patchValue({
      title: this.admin.buildLocalizedText(course.title),
      description: this.admin.buildLocalizedText(course.description),
      price: Number(course.price ?? 0),
      thumbnail: course.thumbnail || '',
      categoryId: this.admin.buildLocalizedText(course.categoryId),
      published: !!course.published,

      heroEyebrow: this.admin.buildLocalizedText(course.heroEyebrow),
      heroTagline: this.admin.buildLocalizedText(course.heroTagline),
      heroTitleHighlight: this.admin.buildLocalizedText(
        course.heroTitleHighlight,
      ),

      introVideoUrl: course.introVideoUrl || '',

      programDuration: this.admin.buildLocalizedText(course.programDuration),
      targetAudience: this.admin.buildLocalizedText(course.targetAudience),
      goalTitle: this.admin.buildLocalizedText(course.goalTitle),
      goalDescription: this.admin.buildLocalizedText(course.goalDescription),
      expectedStudyTimeTitle: this.admin.buildLocalizedText(
        course.expectedStudyTimeTitle,
      ),
      expectedStudyTimeDescription: this.admin.buildLocalizedText(
        course.expectedStudyTimeDescription,
      ),
      prerequisitesTitle: this.admin.buildLocalizedText(
        course.prerequisitesTitle,
      ),
      prerequisitesDescription: this.admin.buildLocalizedText(
        course.prerequisitesDescription,
      ),

      offerPercent: Number(course.offer?.percent || 0),
      offerHeading: this.admin.buildLocalizedText(course.offer?.heading),
      offerText: this.admin.buildLocalizedText(course.offer?.text),
      offerCtaText: this.admin.buildLocalizedText(course.offer?.ctaText),

      bottomCtaText: this.admin.buildLocalizedText(course.bottomCta?.text),
      bottomCtaButtonText: this.admin.buildLocalizedText(
        course.bottomCta?.buttonText,
      ),
    });

    this.clearFormArray(this.lectureNames);
    this.clearFormArray(this.meta);
    this.clearFormArray(this.outcomes);
    this.clearFormArray(this.audienceItems);
    this.clearFormArray(this.sectionCards);
    this.clearFormArray(this.curriculum);
    this.clearFormArray(this.faqs);
    this.clearFormArray(this.communityPerks);
    this.clearFormArray(this.testimonials);
    this.clearFormArray(this.pricingPlans);

    this.toLocalizedItems(course.lectureNames).forEach((item) =>
      this.addLectureName(item),
    );
    (course.meta || []).forEach((item) => this.addMetaItem(item));
    this.toLocalizedItems(course.outcomes).forEach((item) =>
      this.addOutcome(item),
    );
    this.toLocalizedItems(course.audienceItems).forEach((item) =>
      this.addAudienceItem(item),
    );
    (course.sectionCards || []).forEach((item) => this.addSectionCard(item));
    (course.curriculum || []).forEach((item) => this.addCurriculumItem(item));
    (course.faqs || []).forEach((item) => this.addFaq(item));
    this.toLocalizedItems(course.communityPerks).forEach((item) =>
      this.addCommunityPerk(item),
    );
    (course.testimonials || []).forEach((item) => this.addTestimonial(item));
    (course.pricingPlans || []).forEach((item) => this.addPricingPlan(item));

    if (!this.lectureNames.length) this.addLectureName();
    if (!this.meta.length) this.addMetaItem();
    if (!this.outcomes.length) this.addOutcome();
    if (!this.audienceItems.length) this.addAudienceItem();
    if (!this.sectionCards.length) this.addSectionCard();
    if (!this.curriculum.length) this.addCurriculumItem();
    if (!this.faqs.length) this.addFaq();
    if (!this.communityPerks.length) this.addCommunityPerk();
    if (!this.testimonials.length) this.addTestimonial();
    if (!this.pricingPlans.length) this.addPricingPlan();
  }

  private textValue(group: LangTextGroup): LocalizedText {
    return {
      ar: (group.get('ar')?.value || '').trim(),
      en: (group.get('en')?.value || '').trim(),
    };
  }

  private textListFromArray(
    arr: FormArray<LangTextGroup>,
  ): LocalizedStringList {
    return {
      ar: arr.controls
        .map((ctrl) => (ctrl.get('ar')?.value || '').trim())
        .filter(Boolean),
      en: arr.controls
        .map((ctrl) => (ctrl.get('en')?.value || '').trim())
        .filter(Boolean),
    };
  }

  private multilineToList(value: string): string[] {
    return (value || '')
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private hasText(value?: Partial<LocalizedText> | null): boolean {
    return !!value?.ar?.trim() || !!value?.en?.trim();
  }

  private hasListItems(value?: Partial<LocalizedStringList> | null): boolean {
    const safeValue = value ?? {};
    const arItems = Array.isArray(safeValue.ar) ? safeValue.ar : [];
    const enItems = Array.isArray(safeValue.en) ? safeValue.en : [];

    return [...arItems, ...enItems].some((item) => `${item || ''}`.trim());
  }

  private getCoursePublishReadinessIssues(course: AdminCourse): string[] {
    const issues: string[] = [];
    const hasAudienceContent =
      this.hasListItems(course.audienceItems) ||
      this.hasText(course.targetAudience) ||
      this.hasText(course.prerequisitesDescription);
    const hasCurriculumContent =
      this.hasListItems(course.lectureNames) ||
      (course.curriculum || []).some(
        (item) => this.hasText(item.title) || this.hasListItems(item.points),
      );
    const hasPricingContent =
      (course.pricingPlans || []).length > 0 || Number(course.price || 0) > 0;

    if (!this.hasText(course.title)) issues.push('عنوان الكورس');
    if (!this.hasText(course.description)) issues.push('وصف مختصر للكورس');
    if (!(course.thumbnail || '').trim()) issues.push('الصورة المصغرة');
    if (!this.hasText(course.categoryId)) issues.push('التصنيف');
    if (!this.hasListItems(course.outcomes)) issues.push('مخرجات التعلم');
    if (!hasAudienceContent) issues.push('الفئة المستهدفة أو متطلبات البداية');
    if (!hasCurriculumContent) issues.push('المنهج أو أسماء الدروس');
    if (!(course.testimonials || []).length)
      issues.push('آراء وتجارب المتعلمين');
    if (!(course.faqs || []).length) issues.push('الأسئلة الشائعة');
    if (!hasPricingContent) issues.push('خطة سعر أو سعر أساسي');

    return issues;
  }

  private buildCoursePayload(): AdminCourse {
    const formValue = this.courseForm.controls;

    const offerPercent = Number(formValue.offerPercent.value || 0);
    const offerHeading = this.textValue(formValue.offerHeading);
    const offerText = this.textValue(formValue.offerText);
    const offerCtaText = this.textValue(formValue.offerCtaText);

    const hasOfferContent =
      offerPercent > 0 ||
      offerHeading.ar ||
      offerHeading.en ||
      offerText.ar ||
      offerText.en ||
      offerCtaText.ar ||
      offerCtaText.en;

    const offer: AdminCourseOffer | null = hasOfferContent
      ? {
          percent: offerPercent,
          heading: offerHeading,
          text: offerText,
          ctaText: offerCtaText,
        }
      : null;

    const bottomCtaText = this.textValue(formValue.bottomCtaText);
    const bottomCtaButtonText = this.textValue(formValue.bottomCtaButtonText);

    const hasBottomCtaContent =
      bottomCtaText.ar ||
      bottomCtaText.en ||
      bottomCtaButtonText.ar ||
      bottomCtaButtonText.en;

    const bottomCta: AdminCourseBottomCta | null = hasBottomCtaContent
      ? {
          text: bottomCtaText,
          buttonText: bottomCtaButtonText,
        }
      : null;

    return {
      title: this.textValue(formValue.title),
      description: this.textValue(formValue.description),
      price: Number(formValue.price.value || 0),
      thumbnail: formValue.thumbnail.value.trim(),
      categoryId: this.textValue(formValue.categoryId),
      published: !!formValue.published.value,

      heroEyebrow: this.textValue(formValue.heroEyebrow),
      heroTagline: this.textValue(formValue.heroTagline),
      heroTitleHighlight: this.textValue(formValue.heroTitleHighlight),

      introVideoUrl: formValue.introVideoUrl.value.trim(),

      programDuration: this.textValue(formValue.programDuration),
      targetAudience: this.textValue(formValue.targetAudience),
      goalTitle: this.textValue(formValue.goalTitle),
      goalDescription: this.textValue(formValue.goalDescription),
      expectedStudyTimeTitle: this.textValue(formValue.expectedStudyTimeTitle),
      expectedStudyTimeDescription: this.textValue(
        formValue.expectedStudyTimeDescription,
      ),
      prerequisitesTitle: this.textValue(formValue.prerequisitesTitle),
      prerequisitesDescription: this.textValue(
        formValue.prerequisitesDescription,
      ),

      lectureNames: this.textListFromArray(this.lectureNames),

      meta: this.meta.controls
        .map((group) => ({
          label: this.textValue(group.controls.label),
          value: this.textValue(group.controls.value),
        }))
        .filter(
          (item) =>
            item.label.ar || item.label.en || item.value.ar || item.value.en,
        ),

      outcomes: this.textListFromArray(this.outcomes),
      audienceItems: this.textListFromArray(this.audienceItems),

      sectionCards: this.sectionCards.controls
        .map((group) => ({
          title: this.textValue(group.controls.title),
          description: this.textValue(group.controls.description),
        }))
        .filter(
          (item) =>
            item.title.ar ||
            item.title.en ||
            item.description.ar ||
            item.description.en,
        ),

      curriculum: this.curriculum.controls
        .map((group) => ({
          title: this.textValue(group.controls.title),
          points: {
            ar: this.multilineToList(group.controls.pointsAr.value),
            en: this.multilineToList(group.controls.pointsEn.value),
          },
        }))
        .filter(
          (item) =>
            item.title.ar ||
            item.title.en ||
            item.points.ar.length ||
            item.points.en.length,
        ),

      faqs: this.faqs.controls
        .map((group) => ({
          question: this.textValue(group.controls.question),
          answer: this.textValue(group.controls.answer),
        }))
        .filter(
          (item) =>
            item.question.ar ||
            item.question.en ||
            item.answer.ar ||
            item.answer.en,
        ),

      communityPerks: this.textListFromArray(this.communityPerks),

      testimonials: this.testimonials.controls
        .map((group) => ({
          name: this.textValue(group.controls.name),
          tag: this.textValue(group.controls.tag),
          rating: Number(group.controls.rating.value || 0),
          text: this.textValue(group.controls.text),
        }))
        .filter(
          (item) =>
            item.name.ar ||
            item.name.en ||
            item.tag.ar ||
            item.tag.en ||
            item.text.ar ||
            item.text.en,
        ),

      pricingPlans: this.pricingPlans.controls
        .map((group) => ({
          name: this.textValue(group.controls.name),
          badge: this.textValue(group.controls.badge),
          priceBeforeOfferText: this.textValue(
            group.controls.priceBeforeOfferText,
          ),
          priceText: this.textValue(group.controls.priceText),
          note: this.textValue(group.controls.note),
          highlighted: !!group.controls.highlighted.value,
          hideStudyMaterial: !!group.controls.hideStudyMaterial.value,
          features: {
            ar: this.multilineToList(group.controls.featuresAr.value),
            en: this.multilineToList(group.controls.featuresEn.value),
          },
        }))
        .filter(
          (item) =>
            item.name.ar ||
            item.name.en ||
            item.priceBeforeOfferText.ar ||
            item.priceBeforeOfferText.en ||
            item.priceText.ar ||
            item.priceText.en ||
            item.features.ar.length ||
            item.features.en.length,
        ),

      offer,
      bottomCta,
    };
  }


  fillCourseFieldsFromBulkText(): void {
    this.bulkImportError = undefined;
    this.bulkImportMessage = undefined;

    const rawText = this.bulkLandingPageControl.value.trim();
    if (!rawText) {
      this.bulkImportError = 'ضع بيانات صفحة البيع داخل المربع أولًا.';
      return;
    }

    const parsed = this.parseLandingPageText(rawText);
    const hasAnyData = !!(
      parsed.ar.title ||
      parsed.en.title ||
      parsed.ar.description ||
      parsed.en.description ||
      parsed.ar.curriculum.length ||
      parsed.en.curriculum.length ||
      parsed.ar.sectionCards.length ||
      parsed.en.sectionCards.length ||
      parsed.ar.pricingPlans.length ||
      parsed.en.pricingPlans.length
    );

    if (!hasAnyData) {
      this.bulkImportError =
        'لم أتمكن من قراءة البيانات. تأكد أن النص بنفس ترتيب الفورم وفيه عناوين الخانات مثل: عنوان الكورس، الوصف المختصر، عناصر التعلم.';
      return;
    }

    this.applyParsedLandingPage(parsed);

    const arCount = this.countParsedItems(parsed.ar);
    const enCount = this.countParsedItems(parsed.en);
    this.bulkImportMessage = `تم ملء الخانات بنجاح. تم قراءة ${arCount} عنصر عربي و ${enCount} عنصر إنجليزي.`;
  }

  private emptyParsedLandingPage(): ParsedLocalizedLandingPage {
    return {
      meta: [],
      outcomes: [],
      curriculum: [],
      audienceItems: [],
      sectionCards: [],
      pricingPlans: [],
      communityPerks: [],
    };
  }

  private countParsedItems(data: ParsedLocalizedLandingPage): number {
    return [
      data.title,
      data.description,
      data.heroEyebrow,
      data.heroTagline,
      data.heroTitleHighlight,
      data.categoryId,
      data.goalTitle,
      data.goalDescription,
      data.programDuration,
      data.targetAudience,
      data.expectedStudyTimeTitle,
      data.expectedStudyTimeDescription,
      data.prerequisitesTitle,
      data.prerequisitesDescription,
      data.bottomCtaText,
      data.bottomCtaButtonText,
      data.offerHeading,
      data.offerText,
      data.offerCtaText,
      ...data.meta.flatMap((item) => [item.label, item.value]),
      ...data.outcomes,
      ...data.curriculum.flatMap((item) => [item.title, ...item.points]),
      ...data.audienceItems,
      ...data.sectionCards.flatMap((item) => [item.title, item.description]),
      ...data.pricingPlans.flatMap((item) => [
        item.name,
        item.badge,
        item.note,
        ...item.features,
      ]),
      ...data.communityPerks,
    ].filter((item) => `${item || ''}`.trim()).length;
  }

  private parseLandingPageText(rawText: string): ParsedLandingPage {
    const normalizedText = this.normalizeBulkText(rawText);
    const englishMarker = /(?:بيانات\s+Landing\s+Page\s*[—-]\s*النسخة\s+الإنجليزية|النسخة\s+الإنجليزية|English\s+Version)/i;
    const markerMatch = englishMarker.exec(normalizedText);

    const arText = markerMatch
      ? normalizedText.slice(0, markerMatch.index).trim()
      : normalizedText;
    const enText = markerMatch
      ? normalizedText.slice(markerMatch.index + markerMatch[0].length).trim()
      : '';

    return {
      ar: this.parseLocalizedLandingPageBlock(arText),
      en: this.parseLocalizedLandingPageBlock(enText),
    };
  }

  private parseLocalizedLandingPageBlock(text: string): ParsedLocalizedLandingPage {
    const data = this.emptyParsedLandingPage();
    if (!text.trim()) return data;

    const heroBlock = this.sectionBetween(text, '1.', '2.');
    data.title = this.cleanBulkValue(this.valueAfter(heroBlock, 'عنوان الكورس:', 'الوصف المختصر:'));
    data.description = this.cleanBulkValue(this.valueAfter(heroBlock, 'الوصف المختصر:', 'Eyebrow'));
    data.heroEyebrow = this.cleanBulkValue(this.valueAfter(heroBlock, 'Eyebrow / عنوان صغير أعلى الهيرو:', 'Tagline / سطر تعريفي قصير:'));
    data.heroTagline = this.cleanBulkValue(this.valueAfter(heroBlock, 'Tagline / سطر تعريفي قصير:', 'Highlighted title / الجزء المميز من العنوان:'));
    data.heroTitleHighlight = this.cleanBulkValue(this.valueAfter(heroBlock, 'Highlighted title / الجزء المميز من العنوان:', 'التصنيف:'));
    data.categoryId = this.cleanBulkValue(this.valueAfter(heroBlock, 'التصنيف:', 'رابط الصورة المصغرة:'));
    data.thumbnail = this.cleanUrlValue(this.cleanBulkValue(this.valueAfter(heroBlock, 'رابط الصورة المصغرة:', 'السعر الأساسي')));
    data.price = this.parseNumberValue(this.valueAfter(heroBlock, 'السعر الأساسي', ''));

    const metaBlock = this.sectionBetween(text, '2.', '3.');
    data.meta = this.parseMetaItems(metaBlock);

    const goalBlock = this.sectionBetween(text, '3.', '4.');
    data.goalTitle = this.cleanBulkValue(this.valueAfter(goalBlock, 'عنوان الهدف:', 'وصف الهدف:'));
    data.goalDescription = this.cleanBulkValue(this.valueAfter(goalBlock, 'وصف الهدف:', ''));

    const outcomesBlock = this.sectionBetween(text, '4.', '6.');
    data.outcomes = this.parseNumberedItems(this.valueAfter(outcomesBlock, 'عناصر التعلم:', ''));

    const curriculumBlock = this.sectionBetween(text, '6.', '7.');
    data.curriculum = this.parseCurriculumItems(curriculumBlock);

    const studyBlock = this.sectionBetween(text, '7.', '8.');
    data.programDuration = this.cleanBulkValue(this.valueAfter(studyBlock, 'مدة البرنامج:', 'لمن هذا البرنامج؟'));
    data.targetAudience = this.cleanBulkValue(this.valueAfter(studyBlock, 'لمن هذا البرنامج؟ / وصف مختصر للجمهور:', 'المدة المتوقعة للدراسة:'));
    data.expectedStudyTimeTitle = this.cleanBulkValue(this.valueAfter(studyBlock, 'المدة المتوقعة للدراسة:', 'وصف المدة أو نمط الدراسة:'));
    data.expectedStudyTimeDescription = this.cleanBulkValue(this.valueAfter(studyBlock, 'وصف المدة أو نمط الدراسة:', ''));

    const audienceBlock = this.sectionBetween(text, '8.', '9.');
    const prereqStart = this.indexOfAny(audienceBlock, ['المتطلبات السابقة']);
    const audienceOnlyBlock = prereqStart >= 0 ? audienceBlock.slice(0, prereqStart) : audienceBlock;
    data.audienceItems = this.parseNumberedItems(
      this.valueAfter(audienceOnlyBlock, 'مراحل التحسين المناسبة لك', ''),
    );
    data.prerequisitesTitle =
      this.cleanBulkValue(
        this.valueAfter(
          audienceBlock,
          'المتطلبات السابقة / عنوان يظهر في الكارت:',
          'وصف المتطلبات السابقة:',
        ),
      ) ||
      this.cleanBulkValue(
        this.valueAfter(
          audienceBlock,
          'المتطلبات السابقة ( عنوان يظهر في الكارت) :',
          'وصف المتطلبات السابقة:',
        ),
      ) ||
      this.cleanBulkValue(
        this.valueAfter(audienceBlock, 'المتطلبات السابقة', 'وصف المتطلبات السابقة:'),
      );
    data.prerequisitesDescription = this.cleanBulkValue(this.valueAfter(audienceBlock, 'وصف المتطلبات السابقة:', ''));

    const pricingStartIndex = text.indexOf('11.');
    const transformationBlock = pricingStartIndex >= 0
      ? this.sectionBetween(text, '9.', '11.')
      : this.sectionBetween(text, '9.', '12.');
    data.sectionCards = this.parseTitleDescriptionBlocks(transformationBlock, 'التحول المتوقع');

    const pricingBlock = this.sectionBetween(text, '11.', '12.');
    data.pricingPlans = this.parsePricingPlanItems(pricingBlock);

    const communityBlock = this.sectionBetween(text, '12.', '14.');
    data.communityPerks = this.parseCommunityItems(communityBlock);

    const bottomCtaBlock = this.sectionBetween(text, '14.', '15.');
    data.bottomCtaText = this.cleanBulkValue(this.valueAfter(bottomCtaBlock, 'النص:', 'نص الزر:'));
    data.bottomCtaButtonText = this.cleanBulkValue(this.valueAfter(bottomCtaBlock, 'نص الزر:', ''));

    const offerBlock = this.sectionAfter(text, '15.');
    data.offerPercent = this.parseNumberValue(this.valueAfter(offerBlock, 'النسبة %:', 'عنوان العرض:'));
    data.offerHeading = this.cleanBulkValue(this.valueAfter(offerBlock, 'عنوان العرض:', 'نص العرض:'));
    data.offerText = this.cleanBulkValue(this.valueAfter(offerBlock, 'نص العرض:', 'نص الزر:'));
    data.offerCtaText = this.cleanBulkValue(this.valueAfter(offerBlock, 'نص الزر:', ''));

    return data;
  }

  private applyParsedLandingPage(parsed: ParsedLandingPage): void {
    const controls = this.courseForm.controls;

    this.patchLangGroup(controls.title, parsed.ar.title, parsed.en.title);
    this.patchLangGroup(controls.description, parsed.ar.description, parsed.en.description);
    this.patchLangGroup(controls.heroEyebrow, parsed.ar.heroEyebrow, parsed.en.heroEyebrow);
    this.patchLangGroup(controls.heroTagline, parsed.ar.heroTagline, parsed.en.heroTagline);
    this.patchLangGroup(controls.heroTitleHighlight, parsed.ar.heroTitleHighlight, parsed.en.heroTitleHighlight);
    this.patchLangGroup(controls.categoryId, parsed.ar.categoryId, parsed.en.categoryId);
    this.patchLangGroup(controls.goalTitle, parsed.ar.goalTitle, parsed.en.goalTitle);
    this.patchLangGroup(controls.goalDescription, parsed.ar.goalDescription, parsed.en.goalDescription);
    this.patchLangGroup(controls.programDuration, parsed.ar.programDuration, parsed.en.programDuration);
    this.patchLangGroup(controls.targetAudience, parsed.ar.targetAudience, parsed.en.targetAudience);
    this.patchLangGroup(controls.expectedStudyTimeTitle, parsed.ar.expectedStudyTimeTitle, parsed.en.expectedStudyTimeTitle);
    this.patchLangGroup(controls.expectedStudyTimeDescription, parsed.ar.expectedStudyTimeDescription, parsed.en.expectedStudyTimeDescription);
    this.patchLangGroup(controls.prerequisitesTitle, parsed.ar.prerequisitesTitle, parsed.en.prerequisitesTitle);
    this.patchLangGroup(controls.prerequisitesDescription, parsed.ar.prerequisitesDescription, parsed.en.prerequisitesDescription);
    this.patchLangGroup(controls.bottomCtaText, parsed.ar.bottomCtaText, parsed.en.bottomCtaText);
    this.patchLangGroup(controls.bottomCtaButtonText, parsed.ar.bottomCtaButtonText, parsed.en.bottomCtaButtonText);
    this.patchLangGroup(controls.offerHeading, parsed.ar.offerHeading, parsed.en.offerHeading);
    this.patchLangGroup(controls.offerText, parsed.ar.offerText, parsed.en.offerText);
    this.patchLangGroup(controls.offerCtaText, parsed.ar.offerCtaText, parsed.en.offerCtaText);

    if (parsed.ar.thumbnail || parsed.en.thumbnail) {
      controls.thumbnail.setValue(parsed.ar.thumbnail || parsed.en.thumbnail || '');
    }

    if (Number(parsed.ar.price || parsed.en.price || 0) > 0) {
      controls.price.setValue(Number(parsed.ar.price || parsed.en.price || 0));
    }

    if (Number(parsed.ar.offerPercent || parsed.en.offerPercent || 0) > 0) {
      controls.offerPercent.setValue(
        Number(parsed.ar.offerPercent || parsed.en.offerPercent || 0),
      );
    }

    this.replaceMetaItems(parsed.ar.meta, parsed.en.meta);
    this.replaceLocalizedTextArray(this.outcomes, parsed.ar.outcomes, parsed.en.outcomes, (item) => this.addOutcome(item));
    this.replaceCurriculumItems(parsed.ar.curriculum, parsed.en.curriculum);
    this.replaceLocalizedTextArray(this.audienceItems, parsed.ar.audienceItems, parsed.en.audienceItems, (item) => this.addAudienceItem(item));
    this.replaceSectionCards(parsed.ar.sectionCards, parsed.en.sectionCards);
    this.replacePricingPlanItems(parsed.ar.pricingPlans, parsed.en.pricingPlans);
    this.replaceLocalizedTextArray(this.communityPerks, parsed.ar.communityPerks, parsed.en.communityPerks, (item) => this.addCommunityPerk(item));
  }

  private patchLangGroup(group: LangTextGroup, ar?: string, en?: string): void {
    if (ar !== undefined || en !== undefined) {
      group.patchValue({
        ar: ar ?? group.controls.ar.value,
        en: en ?? group.controls.en.value,
      });
    }
  }

  private replaceLocalizedTextArray(
    arr: FormArray<LangTextGroup>,
    arItems: string[],
    enItems: string[],
    addItem: (value: Partial<LocalizedText>) => void,
  ): void {
    const max = Math.max(arItems.length, enItems.length);
    if (!max) return;

    this.clearFormArray(arr);
    for (let index = 0; index < max; index += 1) {
      addItem({ ar: arItems[index] || '', en: enItems[index] || '' });
    }
  }

  private replaceMetaItems(
    arItems: { label: string; value: string }[],
    enItems: { label: string; value: string }[],
  ): void {
    const max = Math.max(arItems.length, enItems.length);
    if (!max) return;

    this.clearFormArray(this.meta);
    for (let index = 0; index < max; index += 1) {
      this.addMetaItem({
        label: {
          ar: arItems[index]?.label || '',
          en: enItems[index]?.label || '',
        },
        value: {
          ar: arItems[index]?.value || '',
          en: enItems[index]?.value || '',
        },
      });
    }
  }

  private replaceCurriculumItems(
    arItems: { title: string; points: string[] }[],
    enItems: { title: string; points: string[] }[],
  ): void {
    const max = Math.max(arItems.length, enItems.length);
    if (!max) return;

    this.clearFormArray(this.curriculum);
    for (let index = 0; index < max; index += 1) {
      this.addCurriculumItem({
        title: {
          ar: arItems[index]?.title || '',
          en: enItems[index]?.title || '',
        },
        points: {
          ar: arItems[index]?.points || [],
          en: enItems[index]?.points || [],
        },
      });
    }
  }

  private replaceSectionCards(
    arItems: { title: string; description: string }[],
    enItems: { title: string; description: string }[],
  ): void {
    const max = Math.max(arItems.length, enItems.length);
    if (!max) return;

    this.clearFormArray(this.sectionCards);
    for (let index = 0; index < max; index += 1) {
      this.addSectionCard({
        title: {
          ar: arItems[index]?.title || '',
          en: enItems[index]?.title || '',
        },
        description: {
          ar: arItems[index]?.description || '',
          en: enItems[index]?.description || '',
        },
      });
    }
  }

  private replacePricingPlanItems(
    arItems: { name: string; badge: string; note: string; features: string[] }[],
    enItems: { name: string; badge: string; note: string; features: string[] }[],
  ): void {
    const max = Math.max(arItems.length, enItems.length);
    if (!max) return;

    this.clearFormArray(this.pricingPlans);
    for (let index = 0; index < max; index += 1) {
      this.addPricingPlan({
        name: {
          ar: arItems[index]?.name || '',
          en: enItems[index]?.name || '',
        },
        badge: {
          ar: arItems[index]?.badge || '',
          en: enItems[index]?.badge || '',
        },
        priceBeforeOfferText: { ar: '', en: '' },
        priceText: { ar: '', en: '' },
        note: {
          ar: arItems[index]?.note || '',
          en: enItems[index]?.note || '',
        },
        features: {
          ar: arItems[index]?.features || [],
          en: enItems[index]?.features || [],
        },
      });
    }
  }

  private normalizeBulkText(value: string): string {
    return (value || '')
      .replace(/\r/g, '')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/\u00a0/g, ' ')
      .replace(/\t/g, '  ')
      .replace(/^[_\sـ-]{5,}$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private sectionBetween(text: string, startMarker: string, endMarker: string): string {
    const startIndex = text.indexOf(startMarker);
    if (startIndex < 0) return '';

    const endIndex = text.indexOf(endMarker, startIndex + startMarker.length);
    return (endIndex >= 0 ? text.slice(startIndex, endIndex) : text.slice(startIndex)).trim();
  }

  private sectionAfter(text: string, startMarker: string): string {
    const startIndex = text.indexOf(startMarker);
    return startIndex >= 0 ? text.slice(startIndex).trim() : '';
  }

  private valueAfter(text: string, startMarker: string, endMarker: string): string {
    if (!text || !startMarker) return '';

    const startIndex = text.indexOf(startMarker);
    if (startIndex < 0) return '';

    const from = startIndex + startMarker.length;
    const endIndex = endMarker ? text.indexOf(endMarker, from) : -1;
    return (endIndex >= 0 ? text.slice(from, endIndex) : text.slice(from)).trim();
  }

  private indexOfAny(text: string, markers: string[]): number {
    const indexes = markers
      .map((marker) => text.indexOf(marker))
      .filter((index) => index >= 0);

    return indexes.length ? Math.min(...indexes) : -1;
  }

  private cleanBulkValue(value?: string): string {
    return (value || '')
      .split('\n')
      .map((line) =>
        line
          .replace(/^[-–—•]+\s*/, '')
          .replace(/^\d+[.)-]\s*/, '')
          .replace(/^[:：]\s*/, '')
          .trim(),
      )
      .filter(
        (line) =>
          !!line &&
          !/^[_\sـ-]{5,}$/.test(line) &&
          !/^\/?\s*[\u0600-\u06FFa-zA-Z0-9\s؟?()/%-]+:$/.test(line),
      )
      .join('\n')
      .trim();
  }

  private cleanUrlValue(value: string): string {
    const cleaned = this.cleanBulkValue(value);
    if (!cleaned) return '';

    const lower = cleaned.toLowerCase();
    const isPlaceholder =
      cleaned.includes('لوحة الإدارة') ||
      cleaned.includes('Firebase Storage') ||
      lower.includes('admin panel') ||
      lower.includes('to be added');

    return isPlaceholder ? '' : cleaned;
  }

  private parseNumberValue(value?: string): number {
    const normalized = `${value || ''}`.replace(/[٠-٩]/g, (digit) =>
      `${'٠١٢٣٤٥٦٧٨٩'.indexOf(digit)}`,
    );
    const match = normalized.match(/\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : 0;
  }

  private parseNumberedItems(block: string): string[] {
    const lines = (block || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    return lines
      .filter((line) => /^\d+[.)-]\s+/.test(line))
      .map((line) => this.cleanBulkValue(line))
      .filter(Boolean);
  }

  private parseMetaItems(block: string): { label: string; value: string }[] {
    const lines = (block || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const items: { label: string; value: string }[] = [];

    for (let index = 0; index < lines.length; index += 1) {
      if (!/^Label\s*\//i.test(lines[index])) continue;

      const label = this.cleanBulkValue(
        lines[index].replace(/^Label\s*\/\s*اسم البيان\s*:?/i, ''),
      ) || this.cleanBulkValue(lines[index + 1] || '');

      let value = '';
      const valueLineIndex = lines.findIndex(
        (line, lineIndex) => lineIndex > index && /^Value\s*\//i.test(line),
      );

      if (valueLineIndex >= 0) {
        value = this.cleanBulkValue(
          lines[valueLineIndex].replace(/^Value\s*\/\s*القيمة\s*:?/i, ''),
        ) || this.cleanBulkValue(lines[valueLineIndex + 1] || '');
        index = valueLineIndex;
      }

      if (label || value) items.push({ label, value });
    }

    return items;
  }

  private parseCurriculumItems(block: string): { title: string; points: string[] }[] {
    return (block || '')
      .split(/\n\s*عنصر من محتوى البرنامج\s*\n/g)
      .map((part) => part.trim())
      .filter((part) => part.includes('عنوان المحور:'))
      .map((part) => ({
        title: this.cleanBulkValue(this.valueAfter(part, 'عنوان المحور:', 'نقاط المحور:')),
        points: this.cleanBulkValue(this.valueAfter(part, 'نقاط المحور:', ''))
          .split('\n')
          .map((line) => this.cleanBulkValue(line))
          .filter(Boolean),
      }))
      .filter((item) => item.title || item.points.length);
  }

  private parseTitleDescriptionBlocks(
    block: string,
    splitMarker: string,
  ): { title: string; description: string }[] {
    return (block || '')
      .split(new RegExp(`\\n\\s*${splitMarker}\\s*\\n`, 'g'))
      .map((part) => part.trim())
      .filter((part) => part.includes('العنوان:'))
      .map((part) => ({
        title: this.cleanBulkValue(this.valueAfter(part, 'العنوان:', 'الوصف:')),
        description: this.cleanBulkValue(this.valueAfter(part, 'الوصف:', '')),
      }))
      .filter((item) => item.title || item.description);
  }

  private parsePricingPlanItems(
    block: string,
  ): { name: string; badge: string; note: string; features: string[] }[] {
    const normalizedBlock = (block || '').trim();
    if (!normalizedBlock) return [];

    return normalizedBlock
      .split(/\n\s*اسم\s+الخطة\s*:/g)
      .map((part, index) => (index === 0 ? '' : `اسم الخطة:${part}`).trim())
      .filter((part) => part.includes('اسم الخطة'))
      .map((part) => {
        const name = this.cleanBulkValue(this.valueAfter(part, 'اسم الخطة', 'Badge'));
        const badge = this.cleanBulkValue(this.valueAfter(part, 'Badge', 'ملاحظة إضافية'));
        const note = this.cleanBulkValue(
          this.valueAfter(part, 'ملاحظة إضافية', 'مميزات الخطة'),
        );
        const features = this.cleanBulkValue(
          this.valueAfter(part, 'مميزات الخطة (كل سطر = ميزة)', ''),
        )
          .split('\n')
          .map((line) => this.cleanBulkValue(line))
          .filter(Boolean);

        return { name, badge, note, features };
      })
      .filter(
        (item) =>
          item.name || item.badge || item.note || item.features.length,
      );
  }

  private parseCommunityItems(block: string): string[] {
    const items: string[] = [];
    const regex = /بعد الاشتراك:?\s*([\s\S]*?)(?=\n\s*بعد الاشتراك:?|$)/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(block || ''))) {
      const value = this.cleanBulkValue(match[1] || '');
      if (value) items.push(value);
    }

    return items;
  }

  async saveCourse(): Promise<void> {
    if (this.courseForm.invalid) {
      this.courseForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = undefined;

    try {
      const payload = this.buildCoursePayload();
      const telegramInviteUrl =
        this.courseForm.controls.telegramInviteUrl.value.trim();

      let targetCourseId = this.courseId;

      if (this.courseId) {
        await this.admin.updateCourse(this.courseId, payload);
      } else {
        targetCourseId = await this.admin.createCourse(payload);
        await this.router.navigate(['/admin/course-editor', targetCourseId]);
      }

      if (targetCourseId) {
        await this.admin.saveCoursePrivate(targetCourseId, {
          telegramInviteUrl,
        });
      }
    } catch (e: any) {
      this.error = e?.message ?? 'تعذّر الحفظ';
    } finally {
      this.loading = false;
    }
  }

  async deleteCourse(): Promise<void> {
    if (!this.courseId) return;
    if (!confirm('متأكد من حذف الكورس؟')) return;

    this.loading = true;
    try {
      await this.admin.deleteCourse(this.courseId);
      await this.router.navigate(['/admin/course-editor']);
    } catch (e: any) {
      this.error = e?.message ?? 'تعذّر الحذف';
    } finally {
      this.loading = false;
    }
  }

  async deleteCourseFromList(id: string): Promise<void> {
    if (!confirm('متأكد من حذف هذا الكورس؟')) return;

    this.loading = true;
    try {
      await this.admin.deleteCourse(id);
      await this.loadCoursesList();
    } catch (e: any) {
      this.error = e?.message ?? 'تعذّر الحذف';
    } finally {
      this.loading = false;
    }
  }

  private async refreshLessons(): Promise<void> {
    if (!this.courseId) return;

    const list = await this.admin.listLessons(this.courseId);
    this.lessons = list.map((l) => ({
      id: l.id,
      title: l.title,
      lessonIndex: l.lessonIndex,
      videoProvider: (l.videoProvider ?? 'youtube') as 'youtube' | 'gdrive',
      videoRef: l.videoRef || '',
      pdfDriveFileId: l.pdfDriveFileId || '',
      pdfTitle: l.pdfTitle || '',
    }));

    this.lessonForm.patchValue({
      lessonIndex: (this.lessons?.length || 0) + 1,
    });
  }

  async saveLesson(): Promise<void> {
    if (!this.courseId) return;

    if (this.lessonForm.invalid) {
      this.lessonForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = undefined;

    const id = this.lessonForm.get('id')!.value;
    const title = (this.lessonForm.get('title')!.value || '').trim();
    const lessonIndex = Math.max(
      1,
      Number(this.lessonForm.get('lessonIndex')!.value) || 1,
    );
    const videoProvider = (this.lessonForm.get('videoProvider')!.value ||
      'youtube') as 'youtube' | 'gdrive';
    const videoRef = (this.lessonForm.get('videoRef')!.value || '').trim();
    const pdfDriveFileId = (
      this.lessonForm.get('pdfDriveFileId')!.value || ''
    ).trim();
    const pdfTitle = (this.lessonForm.get('pdfTitle')!.value || '').trim();

    const payload: AdminLesson = {
      title,
      lessonIndex,
      videoProvider,
      videoRef,
      pdfDriveFileId,
      pdfTitle,
    };

    try {
      if (id) {
        await this.admin.updateLesson(this.courseId, id, payload);
      } else {
        await this.admin.addLesson(this.courseId, payload);
      }

      await this.refreshLessons();
      this.resetLessonForm();
    } catch (e: any) {
      this.error = e?.message ?? 'تعذّر حفظ الدرس';
    } finally {
      this.loading = false;
    }
  }

  editLesson(lesson: LessonRow): void {
    this.lessonForm.patchValue({
      id: lesson.id,
      title: lesson.title || '',
      lessonIndex: lesson.lessonIndex || 1,
      videoProvider: (lesson.videoProvider ?? 'youtube') as
        | 'youtube'
        | 'gdrive',
      videoRef: lesson.videoRef || '',
      pdfDriveFileId: lesson.pdfDriveFileId || '',
      pdfTitle: lesson.pdfTitle || '',
    });
  }

  resetLessonForm(): void {
    this.lessonForm.reset({
      id: null,
      title: '',
      lessonIndex: (this.lessons?.length || 0) + 1,
      videoProvider: 'youtube',
      videoRef: '',
      pdfDriveFileId: '',
      pdfTitle: '',
    });
  }

  async deleteLesson(lessonId: string): Promise<void> {
    if (!this.courseId) return;
    if (!confirm('متأكد من حذف هذا الدرس؟')) return;

    this.loading = true;
    try {
      await this.admin.deleteLesson(this.courseId, lessonId);
      await this.refreshLessons();

      if (this.lessonForm.get('id')!.value === lessonId) {
        this.resetLessonForm();
      }
    } catch (e: any) {
      this.error = e?.message ?? 'تعذّر حذف الدرس';
    } finally {
      this.loading = false;
    }
  }
}
