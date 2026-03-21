export type DiplomaLang = 'ar' | 'en';

export interface DiplomaMetaItem {
  label: string;
  value: string;
}

export interface DiplomaSectionCard {
  title: string;
  description: string;
}

export interface DiplomaCurriculumItem {
  title: string;
  points: string[];
}

export interface DiplomaTestimonial {
  name: string;
  tag?: string;
  rating?: number;
  text: string;
}

export interface DiplomaPricingPlan {
  name: string;
  badge?: string;
  priceText: string;
  note?: string;
  highlighted?: boolean;
  features: string[];
}

export interface DiplomaOffer {
  percent?: number;
  heading?: string;
  text?: string;
  ctaText?: string;
}

export interface DiplomaBottomCta {
  text?: string;
  buttonText?: string;
}

export interface DiplomaMeta {
  totalCourses?: number;
  totalLessons?: number;
  level?: string;
}

export interface Diploma {
  id?: string;
  lang?: DiplomaLang;

  title: string;
  description?: string;
  price?: number;
  thumbnail?: string;
  categoryId?: string;
  published?: boolean;
  createdAt?: number;

  courseIds?: Record<string, boolean>;

  heroEyebrow?: string;
  heroTagline?: string;
  heroTitleHighlight?: string;

  introVideoUrl?: string;

  programDuration?: string;
  targetAudience?: string;
  expectedStudyTimeTitle?: string;
  expectedStudyTimeDescription?: string;
  prerequisitesTitle?: string;
  prerequisitesDescription?: string;
  goalTitle?: string;
  goalDescription?: string;

  lectureNames?: string[];
  meta?: DiplomaMeta;
  metaItems?: DiplomaMetaItem[];
  specs?: string[];
  outcomes?: string[];
  audienceItems?: string[];
  sectionCards?: DiplomaSectionCard[];
  curriculum?: DiplomaCurriculumItem[];
  faqs?: Array<{ question: string; answer: string }>;
  communityPerks?: string[];
  testimonials?: DiplomaTestimonial[];
  pricingPlans?: DiplomaPricingPlan[];
  offer?: DiplomaOffer;
  bottomCta?: DiplomaBottomCta;
}