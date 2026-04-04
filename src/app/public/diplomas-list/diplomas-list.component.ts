import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DiplomasService } from '../services/diplomas.service';
import { Diploma } from 'src/app/shared/models/diploma.model';

@Component({
  selector: 'app-diplomas-list',
  templateUrl: './diplomas-list.component.html',
  styleUrls: ['./diplomas-list.component.css']
})
export class DiplomasListComponent implements OnInit, OnDestroy {
  private router = inject(Router);

  loading = true;
  error?: string;

  diplomas: Array<{ id: string } & Diploma> = [];
  search = '';

  private sub?: Subscription;

  constructor(private diplomasSvc: DiplomasService) {}

  get isEnglish(): boolean {
    return window.location.pathname.startsWith('/en');
  }

  get pageDir(): 'rtl' | 'ltr' {
    return this.isEnglish ? 'ltr' : 'rtl';
  }

  get eyebrowText(): string {
    return this.isEnglish ? 'All diplomas' : 'جميع الدبلومات';
  }

  get pageTitle(): string {
    return this.isEnglish ? 'Nabdah Hayah diplomas' : 'دبلومات نبضة حياة';
  }

  get pageSubtitle(): string {
    return this.isEnglish
      ? 'Explore the currently available diplomas. Each diploma is a structured path that combines multiple related courses in one guided journey.'
      : 'هنا تجد الدبلومات المتاحة حاليًا — كل دبلومة عبارة عن مجموعة كورسات مرتبة داخل مسار واحد.';
  }

  get searchLabel(): string {
    return this.isEnglish ? 'Search for a diploma' : 'ابحث عن دبلومة';
  }

  get searchPlaceholder(): string {
    return this.isEnglish ? 'Search for a diploma...' : 'ابحث عن دبلومة...';
  }

  get loadingText(): string {
    return this.isEnglish ? 'Loading...' : 'جارٍ التحميل…';
  }

  get detailsText(): string {
    return this.isEnglish ? 'View details' : 'عرض التفاصيل';
  }


  get categoryFallback(): string {
    return this.isEnglish ? 'General' : 'عام';
  }

  ngOnInit(): void {
    this.sub = this.diplomasSvc.watchDiplomas().subscribe({
      next: (list) => {
        this.diplomas = list;
        this.loading = false;
      },
      error: (err) => {
        this.error =
          err?.message ??
          (this.isEnglish ? 'An unexpected error occurred' : 'حدث خطأ غير متوقع');
        this.loading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  filteredDiplomas() {
    const k = this.search.trim().toLowerCase();
    if (!k) return this.diplomas;

    return this.diplomas.filter((d) =>
      (d.title || '').toLowerCase().includes(k) ||
      (d.description || '').toLowerCase().includes(k)
    );
  }

  totalCoursesLabel(total?: number): string {
    if (this.isEnglish) {
      return `Includes ${total || 0} course${(total || 0) === 1 ? '' : 's'}`;
    }
    return `يشمل ${total || 0} كورس`;
  }

  programDurationLabel(duration?: string): string {
    return this.isEnglish ? `Program duration: ${duration || '—'}` : `مدة البرنامج: ${duration || '—'}`;
  }

  levelLabel(level?: string): string {
    return this.isEnglish ? `Level: ${level || '—'}` : `المستوى: ${level || '—'}`;
  }

  diplomaPriceLabel(d: ({ id: string } & Diploma)): string {
    const highlightedPlan = d.pricingPlans?.find((plan) => !!plan.highlighted)
      || d.pricingPlans?.[0]
      || null;

    if (highlightedPlan?.priceText?.trim()) {
      return highlightedPlan.priceText;
    }

    if (d.price) {
      return this.isEnglish ? `${d.price} EGP` : `${d.price} جنيه`;
    }

    return this.isEnglish ? 'Contact us' : 'تواصل معنا';
  }

  openDetails(d: { id: string } & Diploma, focusPricing = false): void {
    this.router.navigate(['/diplomas', d.id], {
      fragment: focusPricing ? 'diploma-pricing' : undefined,
    });
  }
}
