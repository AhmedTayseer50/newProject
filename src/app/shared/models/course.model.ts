export type CourseLang = 'ar' | 'en';

export interface CourseMetaItem {
  label: string;
  value: string;
}

export interface CourseSectionCard {
  title: string;
  description: string;
}

export interface CourseCurriculumItem {
  title: string;
  points: string[];
}

export interface CourseTestimonial {
  name: string;
  tag?: string;
  rating?: number;
  text: string;
}

export interface CoursePricingPlan {
  name: string;
  badge?: string;
  priceText: string;
  note?: string;
  highlighted?: boolean;
  features: string[];
}

export interface CourseOffer {
  percent?: number;
  heading?: string;
  text?: string;
  ctaText?: string;
}

export interface CourseBottomCta {
  text?: string;
  buttonText?: string;
}

export interface Course {
  id: string;
  lang: CourseLang;

  title: string;
  description: string;
  price: number;
  thumbnail?: string;
  categoryId?: string;
  published?: boolean;
  createdAt?: number;

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
  meta?: CourseMetaItem[];
  outcomes?: string[];
  audienceItems?: string[];
  sectionCards?: CourseSectionCard[];
  curriculum?: CourseCurriculumItem[];
  faqs?: Array<{ question: string; answer: string }>;
  communityPerks?: string[];
  testimonials?: CourseTestimonial[];
  pricingPlans?: CoursePricingPlan[];
  offer?: CourseOffer;
  bottomCta?: CourseBottomCta;
}