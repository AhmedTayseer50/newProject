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
        priceText: LangTextGroup;
        note: LangTextGroup;
        highlighted: FormControl<boolean>;
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
          priceText: LangTextGroup;
          note: LangTextGroup;
          highlighted: FormControl<boolean>;
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
      priceText: LangTextGroup;
      note: LangTextGroup;
      highlighted: FormControl<boolean>;
      featuresAr: FormControl<string>;
      featuresEn: FormControl<string>;
    }>
  > {
    return this.courseForm.get('pricingPlans') as FormArray<
      FormGroup<{
        name: LangTextGroup;
        badge: LangTextGroup;
        priceText: LangTextGroup;
        note: LangTextGroup;
        highlighted: FormControl<boolean>;
        featuresAr: FormControl<string>;
        featuresEn: FormControl<string>;
      }>
    >;
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
        priceText: this.createLangTextValue(value?.priceText),
        note: this.createLangTextValue(value?.note),
        highlighted: this.fb.nonNullable.control(!!value?.highlighted),
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

  private buildCoursePayload(): AdminCourse {
    const formValue = this.courseForm.controls;

    const offer: AdminCourseOffer = {
      percent: Number(formValue.offerPercent.value || 0),
      heading: this.textValue(formValue.offerHeading),
      text: this.textValue(formValue.offerText),
      ctaText: this.textValue(formValue.offerCtaText),
    };

    const bottomCta: AdminCourseBottomCta = {
      text: this.textValue(formValue.bottomCtaText),
      buttonText: this.textValue(formValue.bottomCtaButtonText),
    };

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
          priceText: this.textValue(group.controls.priceText),
          note: this.textValue(group.controls.note),
          highlighted: !!group.controls.highlighted.value,
          features: {
            ar: this.multilineToList(group.controls.featuresAr.value),
            en: this.multilineToList(group.controls.featuresEn.value),
          },
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

      offer,
      bottomCta,
    };
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