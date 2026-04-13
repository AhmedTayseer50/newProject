import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { Database } from '@angular/fire/database';
import { Meta, Title } from '@angular/platform-browser';
import { get, ref } from 'firebase/database';

export type SeoType = 'website' | 'article' | 'profile';

type StructuredData =
  | Record<string, unknown>
  | Array<Record<string, unknown>>
  | null
  | undefined;

interface RouteSeoPreset {
  title?: string;
  description?: string;
  type?: SeoType;
}

export interface SeoConfig {
  title?: string;
  description?: string;
  image?: string;
  keywords?: string | string[];
  type?: SeoType;
  noindex?: boolean;
  pathname?: string;
  structuredData?: StructuredData;
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly appName = $localize`:@@app_name:نبضة حياة`;
  private readonly defaultDescription = $localize`:@@seo_default_description:منصة نبضة حياة تقدم كورسات نفسية ودبلومات وجلسات واستشارات تساعدك على النمو النفسي وبناء حياة أكثر توازنًا ووعيًا.`;
  private readonly defaultType: SeoType = 'website';
  private readonly seoScriptAttribute = 'data-seo-script';
  private keywordSettings: Record<'ar' | 'en', string> = {
    ar: '',
    en: '',
  };
  private lastConfig: SeoConfig = {};

  constructor(
    private title: Title,
    private meta: Meta,
    private db: Database,
    @Inject(DOCUMENT) private document: Document,
  ) {
    void this.loadKeywordSettings();
  }

  apply(config: SeoConfig = {}): void {
    this.lastConfig = { ...config };
    const pathname = config.pathname || this.getCurrentPathname();
    const routePreset = this.getRoutePreset(pathname);
    const pageTitle = (config.title || routePreset.title || '').trim();
    const fullTitle =
      pageTitle && pageTitle !== this.appName
        ? `${pageTitle} | ${this.appName}`
        : this.appName;
    const description = (
      config.description ||
      routePreset.description ||
      this.defaultDescription
    ).trim();
    const noindex = this.shouldNoIndex(pathname, config.noindex);
    const type = config.type || routePreset.type || this.defaultType;
    const canonicalUrl = this.toAbsoluteUrl(pathname);
    const keywords = this.normalizeKeywords(
      config.keywords || this.getKeywords(pathname),
    );
    const imageUrl = this.toAbsoluteUrl(
      config.image || this.getDefaultImagePath(pathname),
    );

    this.title.setTitle(fullTitle);
    this.setMetaTag('name', 'description', description);
    this.setMetaTag('name', 'keywords', keywords);
    this.setMetaTag('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
    this.setMetaTag('property', 'og:site_name', this.appName);
    this.setMetaTag('property', 'og:locale', this.getLocaleCode(pathname));
    this.setMetaTag('property', 'og:title', fullTitle);
    this.setMetaTag('property', 'og:description', description);
    this.setMetaTag('property', 'og:type', type);
    this.setMetaTag('property', 'og:url', canonicalUrl);
    this.setMetaTag('property', 'og:image', imageUrl);
    this.setMetaTag('name', 'twitter:card', 'summary_large_image');
    this.setMetaTag('name', 'twitter:title', fullTitle);
    this.setMetaTag('name', 'twitter:description', description);
    this.setMetaTag('name', 'twitter:image', imageUrl);

    this.updateCanonical(canonicalUrl);
    this.updateAlternateLinks(pathname);
    this.updateStructuredData(
      config.structuredData ||
        this.buildDefaultStructuredData(pathname, canonicalUrl, description, imageUrl),
    );
  }

  private buildDefaultStructuredData(
    pathname: string,
    canonicalUrl: string,
    description: string,
    imageUrl: string,
  ): Record<string, unknown> {
    const locale = this.getLocaleCode(pathname);
    const withoutLocale = this.stripLocalePrefix(this.normalizePathname(pathname));

    if (withoutLocale === '/') {
      return {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: this.appName,
        description,
        url: canonicalUrl,
        inLanguage: locale,
        image: imageUrl,
      };
    }

    return {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: this.title.getTitle() || this.appName,
      description,
      url: canonicalUrl,
      inLanguage: locale,
      image: imageUrl,
      isPartOf: {
        '@type': 'WebSite',
        name: this.appName,
        url: this.toAbsoluteUrl(this.getLocalePrefix(pathname)),
      },
    };
  }

  private updateStructuredData(structuredData: StructuredData): void {
    const existingScripts = Array.from(
      this.document.head.querySelectorAll(`script[${this.seoScriptAttribute}]`),
    );
    existingScripts.forEach((node) => node.parentNode?.removeChild(node));

    const entries = Array.isArray(structuredData)
      ? structuredData.filter(Boolean)
      : structuredData
        ? [structuredData]
        : [];

    entries.forEach((entry) => {
      const script = this.document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute(this.seoScriptAttribute, 'true');
      script.text = JSON.stringify(entry);
      this.document.head.appendChild(script);
    });
  }

  private getRoutePreset(pathname: string): RouteSeoPreset {
    const locale = this.isEnglishPath(pathname) ? 'en' : 'ar';
    const route = this.stripLocalePrefix(this.normalizePathname(pathname));

    const presets: Record<'ar' | 'en', Record<string, RouteSeoPreset>> = {
      ar: {
        '/': {
          title: 'الرئيسية',
          description:
            'منصة نبضة حياة تقدم كورسات نفسية ودبلومات واستشارات تساعدك على الفهم والتعافي والنمو النفسي بخطوات عملية وآمنة.',
        },
        '/about': {
          title: 'عن الدكتورة',
          description:
            'تعرف على خبرة ورسالة منصة نبضة حياة وكيف تقدم محتوى نفسي عملي وجلسات واستشارات مبنية على فهم عميق وخصوصية كاملة.',
        },
        '/courses': {
          title: 'الكورسات',
          description:
            'استعرض كورسات نبضة حياة النفسية العملية واختر البرنامج المناسب لرحلتك في الفهم والتعافي وبناء حياة أكثر اتزانًا.',
        },
        '/faq': {
          title: 'الأسئلة الشائعة',
          description:
            'إجابات مختصرة وواضحة عن طريقة الاشتراك والدفع والوصول للكورسات والجلسات داخل منصة نبضة حياة.',
        },
        '/consultations': {
          title: 'الاستشارات',
          description:
            'احجز استشارات نفسية خاصة مع خصوصية كاملة وخطة دعم تناسب احتياجك الحالي وتساعدك على الفهم واتخاذ خطوات عملية.',
        },
        '/contact': {
          title: 'تواصل',
          description:
            'تواصل مع فريق نبضة حياة للاستفسار عن الكورسات والدبلومات والجلسات ومتابعة الحجز والدفع والدعم الفني.',
        },
        '/book-session': {
          title: 'حجز جلسة',
          description:
            'ابدأ حجز جلستك النفسية أونلاين عبر منصة نبضة حياة وحدد التفاصيل المناسبة لك بسهولة وخصوصية.',
        },
        '/privacy-policy': {
          title: 'سياسة الخصوصية',
          description:
            'اطلع على كيفية جمع بياناتك واستخدامها وحمايتها عند استخدام منصة نبضة حياة أو شراء الكورسات أو حجز الجلسات.',
        },
        '/terms-and-conditions': {
          title: 'الشروط والأحكام',
          description:
            'تعرف على الشروط والأحكام التي تنظم استخدام منصة نبضة حياة وعمليات الشراء والوصول للمحتوى والخدمات.',
        },
        '/refund-policy': {
          title: 'سياسة الاسترجاع والإلغاء',
          description:
            'راجع سياسة الاسترجاع والإلغاء الخاصة بالكورسات والخدمات الرقمية والجلسات داخل منصة نبضة حياة.',
        },
        '/settings': {
          title: 'الإعدادات',
          description:
            'حدّث بيانات الحساب وتفضيلات اللغة ووضع العرض وإشعارات التواصل من صفحة داخلية مخصصة لإدارة الحساب.',
        },
        '/subscription': {
          title: 'الاشتراك والفوترة',
          description:
            'راجع حالة الطلبات المدفوعة والوصول النشط إلى المحتوى وسجل المشتريات من داخل حسابك.',
        },
        '/certificates': {
          title: 'الشهادات',
          description:
            'تابع الشهادات الصادرة وسجل الكورسات التي ما زالت تحت المتابعة حتى اكتمال الإصدار.',
        },
        '/course-reviews': {
          title: 'تقييمات الكورسات',
          description:
            'أدر تقييماتك الخاصة بالكورسات واحفظ مراجعاتك المحدثة من داخل الحساب التعليمي.',
        },
        '/diplomas': {
          title: 'الدبلومات',
          description:
            'اكتشف دبلومات نبضة حياة المتكاملة التي تجمع بين المعرفة النفسية العملية والمسارات التعليمية المنظمة.',
        },
      },
      en: {
        '/': {
          title: 'Home',
          description:
            'Nabdah Hayah offers practical mental health courses, diplomas, and consultations that support healing, clarity, and balanced growth.',
        },
        '/about': {
          title: 'About the Doctor',
          description:
            'Learn about the doctor behind Nabdah Hayah and the platform mission for practical, confidential, and human-centered mental health support.',
        },
        '/courses': {
          title: 'Courses',
          description:
            'Explore Nabdah Hayah mental health courses and find the right program for healing, awareness, and practical psychological growth.',
        },
        '/faq': {
          title: 'FAQ',
          description:
            'Find quick answers about enrollment, payments, access, and support across courses, diplomas, and consultations.',
        },
        '/consultations': {
          title: 'Consultations',
          description:
            'Book private psychological consultations with complete confidentiality and a practical support path tailored to your needs.',
        },
        '/contact': {
          title: 'Contact',
          description:
            'Contact Nabdah Hayah for help with courses, diplomas, consultations, booking, payments, and technical support.',
        },
        '/book-session': {
          title: 'Book a Session',
          description:
            'Start booking your online psychological session through Nabdah Hayah with a clear, simple, and confidential flow.',
        },
        '/privacy-policy': {
          title: 'Privacy Policy',
          description:
            'Read how Nabdah Hayah collects, uses, stores, and protects your information when using the platform or purchasing services.',
        },
        '/terms-and-conditions': {
          title: 'Terms and Conditions',
          description:
            'Review the terms governing the use of Nabdah Hayah, including account use, purchases, content access, and platform rights.',
        },
        '/refund-policy': {
          title: 'Refund and Cancellation Policy',
          description:
            'Understand the refund and cancellation rules for courses, digital services, and booked sessions on Nabdah Hayah.',
        },
        '/settings': {
          title: 'Settings',
          description:
            'Manage your profile details, language preference, theme, and communication settings from your account area.',
        },
        '/subscription': {
          title: 'Subscription and Billing',
          description:
            'Review paid orders, active learning access, and recent billing activity from your account.',
        },
        '/certificates': {
          title: 'Certificates',
          description:
            'Track issued certificates and course records that are still being followed until certificate release.',
        },
        '/course-reviews': {
          title: 'Course Reviews',
          description:
            'Write, save, and manage your course review drafts directly from your learning account.',
        },
        '/diplomas': {
          title: 'Diplomas',
          description:
            'Discover structured Nabdah Hayah diplomas that combine practical psychological education with guided learning paths.',
        },
      },
    };

    return presets[locale][route] || {};
  }

  private async loadKeywordSettings(): Promise<void> {
    try {
      const snapshot = await get(ref(this.db, 'siteSettings/seo'));
      const data = snapshot.exists() ? snapshot.val() : {};

      this.keywordSettings = {
        ar: this.normalizeKeywords(data?.keywordsAr),
        en: this.normalizeKeywords(data?.keywordsEn),
      };

      if (this.document.location) {
        this.apply(this.lastConfig);
      }
    } catch (error) {
      console.warn('[SeoService] Failed to load SEO keyword settings', error);
    }
  }

  private setMetaTag(attrName: 'name' | 'property', attrValue: string, content: string): void {
    const selector = `${attrName}="${attrValue}"`;
    this.meta.updateTag({ [attrName]: attrValue, content }, selector);
  }

  private updateCanonical(href: string): void {
    let link = this.document.head.querySelector(
      'link[rel="canonical"]',
    ) as HTMLLinkElement | null;

    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }

    link.setAttribute('href', href);
  }

  private updateAlternateLinks(pathname: string): void {
    const normalized = this.normalizePathname(pathname);
    const withoutLocale = this.stripLocalePrefix(normalized);
    const arHref = this.toAbsoluteUrl(`/ar${withoutLocale}`);
    const enHref = this.toAbsoluteUrl(`/en${withoutLocale}`);

    this.setAlternateLink('ar', arHref);
    this.setAlternateLink('en', enHref);
    this.setAlternateLink('x-default', arHref);
  }

  private setAlternateLink(hreflang: string, href: string): void {
    let link = this.document.head.querySelector(
      `link[rel="alternate"][hreflang="${hreflang}"]`,
    ) as HTMLLinkElement | null;

    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'alternate');
      link.setAttribute('hreflang', hreflang);
      this.document.head.appendChild(link);
    }

    link.setAttribute('href', href);
  }

  private shouldNoIndex(pathname: string, explicit?: boolean): boolean {
    if (explicit === true) return true;
    if (explicit === false) return false;

    const withoutLocale = this.stripLocalePrefix(this.normalizePathname(pathname));
    const protectedPrefixes = [
      '/login',
      '/register',
      '/forgot-password',
      '/profile',
      '/settings',
      '/subscription',
      '/certificates',
      '/course-reviews',
      '/checkout',
      '/cart',
      '/payment-result',
      '/lesson',
      '/lesson-material',
      '/my-courses',
      '/admin',
      '/staff',
    ];

    return protectedPrefixes.some(
      (prefix) => withoutLocale === prefix || withoutLocale.startsWith(`${prefix}/`),
    );
  }

  private getDefaultImagePath(pathname: string): string {
    return `${this.getLocalePrefix(pathname)}/assets/images/Asset1.png`;
  }

  private getKeywords(pathname: string): string {
    const locale = this.getLocaleCode(pathname);
    const savedKeywords = this.keywordSettings[locale];
    if (savedKeywords) {
      return savedKeywords;
    }

    return locale === 'en'
      ? 'mental health, psychological consultations, online therapy, mental health courses, Nabdah Hayah'
      : 'نبضة حياة, صحة نفسية, استشارات نفسية, علاج نفسي, كورسات نفسية, دبلومات نفسية';
  }

  private getCurrentPathname(): string {
    return this.document.location?.pathname || '/';
  }

  private toAbsoluteUrl(pathOrUrl: string): string {
    if (/^https?:\/\//i.test(pathOrUrl)) {
      return pathOrUrl;
    }

    const origin = this.document.location?.origin || '';
    return `${origin}${this.normalizePathname(pathOrUrl)}`;
  }

  private normalizePathname(pathname: string): string {
    const normalized = `${pathname || '/'}`.trim();
    if (!normalized) return '/';
    return normalized.startsWith('/') ? normalized : `/${normalized}`;
  }

  private stripLocalePrefix(pathname: string): string {
    const normalized = this.normalizePathname(pathname);
    if (normalized === '/ar' || normalized === '/en') {
      return '/';
    }

    return normalized.replace(/^\/(ar|en)(?=\/|$)/, '') || '/';
  }

  private getLocalePrefix(pathname: string): '/ar' | '/en' {
    return this.isEnglishPath(pathname) ? '/en' : '/ar';
  }

  private getLocaleCode(pathname: string): 'ar' | 'en' {
    return this.isEnglishPath(pathname) ? 'en' : 'ar';
  }

  private isEnglishPath(pathname: string): boolean {
    return this.normalizePathname(pathname).startsWith('/en');
  }

  private normalizeKeywords(value: string | string[] | null | undefined): string {
    if (Array.isArray(value)) {
      return value.map((item) => `${item || ''}`.trim()).filter(Boolean).join(', ');
    }

    return `${value || ''}`
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .join(', ');
  }
}
