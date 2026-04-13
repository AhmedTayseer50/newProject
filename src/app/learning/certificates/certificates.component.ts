import { Component, OnInit } from '@angular/core';
import {
  CertificateCard,
  CertificatesOverview,
  CertificatesService,
} from '../services/certificates.service';

@Component({
  selector: 'app-certificates',
  templateUrl: './certificates.component.html',
  styleUrls: ['./certificates.component.css'],
})
export class CertificatesComponent implements OnInit {
  loading = true;
  overview: CertificatesOverview = {
    isAuthenticated: false,
    issuedCount: 0,
    trackingCount: 0,
    items: [],
  };

  constructor(private certificatesService: CertificatesService) {}

  ngOnInit(): void {
    void this.loadCertificates();
  }

  get isEnglish(): boolean {
    return window.location.pathname.startsWith('/en');
  }

  get pageDir(): 'rtl' | 'ltr' {
    return this.isEnglish ? 'ltr' : 'rtl';
  }

  get titleText(): string {
    return this.isEnglish ? 'Certificates' : 'الشهادات';
  }

  get subtitleText(): string {
    return this.isEnglish
      ? 'Track issued certificates and courses that are still being followed until certificate release.'
      : 'تابع الشهادات التي تم إصدارها، والكورسات التي ما زالت تحت المتابعة حتى صدور الشهادة.';
  }

  get authTitle(): string {
    return this.isEnglish ? 'Sign in to view certificates' : 'سجل الدخول لعرض الشهادات';
  }

  get authText(): string {
    return this.isEnglish
      ? 'Issued certificates and tracked courses are linked to your learning account.'
      : 'الشهادات الصادرة والكورسات الجاري تتبعها مرتبطة بحسابك التعليمي.';
  }

  get emptyTitle(): string {
    return this.isEnglish ? 'No certificates tracked yet' : 'لا توجد شهادات أو تتبع بعد';
  }

  get emptyText(): string {
    return this.isEnglish
      ? 'Once you own a course, it will appear here and its certificate status will be tracked automatically.'
      : 'بمجرد امتلاكك لكورس سيظهر هنا تلقائيًا وسيتم تتبع حالة الشهادة الخاصة به.';
  }

  statusLabel(item: CertificateCard): string {
    if (this.isEnglish) {
      return item.status === 'issued' ? 'Issued' : 'Tracking progress';
    }

    return item.status === 'issued' ? 'تم الإصدار' : 'قيد المتابعة';
  }

  formatDate(timestamp: number | null): string {
    if (!timestamp) return this.isEnglish ? 'Not issued yet' : 'لم تصدر بعد';

    return new Intl.DateTimeFormat(this.isEnglish ? 'en' : 'ar', {
      dateStyle: 'medium',
    }).format(new Date(timestamp));
  }

  private async loadCertificates(): Promise<void> {
    this.loading = true;

    try {
      this.overview = await this.certificatesService.loadCurrentUserCertificates();
    } finally {
      this.loading = false;
    }
  }
}
