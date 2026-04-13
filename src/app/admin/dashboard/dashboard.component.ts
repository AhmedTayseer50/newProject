import { Component, OnInit } from '@angular/core';
import { Database } from '@angular/fire/database';
import { get, ref, set } from 'firebase/database';
import {
  AdminDashboardOverview,
  AnalyticsService,
} from '../services/analytics.service';
import { HttpErrorService } from 'src/app/core/services/http-error.service';
import { NotificationsService } from 'src/app/core/services/notifications.service';

type SeoDashboardSettings = {
  keywordsAr?: string;
  keywordsEn?: string;
};

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  overviewLoading = true;
  overviewError = '';
  overview: AdminDashboardOverview = {
    totalUsers: 0,
    adminsCount: 0,
    disabledUsersCount: 0,
    totalCourses: 0,
    publishedCourses: 0,
    totalDiplomas: 0,
    publishedDiplomas: 0,
    paidOrdersCount: 0,
    pendingOrdersCount: 0,
    failedOrdersCount: 0,
    totalRevenue: 0,
    currentMonthRevenue: 0,
    totalSessionRequests: 0,
    newSessionRequests: 0,
    totalCases: 0,
    openCases: 0,
    latestOrderAt: null,
  };

  keywordsAr = '';
  keywordsEn = '';
  seoLoading = true;
  seoSaving = false;
  seoMessage = '';
  seoMessageType: 'success' | 'error' | '' = '';

  constructor(
    private db: Database,
    private analyticsService: AnalyticsService,
    private httpErrorService: HttpErrorService,
    private notificationsService: NotificationsService,
  ) {}

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadSeoSettings(), this.loadOverview()]);
  }

  async saveSeoSettings(): Promise<void> {
    this.seoSaving = true;
    this.seoMessage = '';
    this.seoMessageType = '';

    try {
      await set(ref(this.db, 'siteSettings/seo'), {
        keywordsAr: this.normalizeKeywords(this.keywordsAr),
        keywordsEn: this.normalizeKeywords(this.keywordsEn),
        updatedAt: Date.now(),
      });

      this.keywordsAr = this.normalizeKeywords(this.keywordsAr);
      this.keywordsEn = this.normalizeKeywords(this.keywordsEn);
      this.seoMessage = 'تم حفظ الكلمات المفتاحية بنجاح.';
      this.seoMessageType = 'success';
      this.notificationsService.success(
        'تم تحديث SEO',
        'تم حفظ الكلمات المفتاحية العامة للموقع بنجاح.',
      );
    } catch (error) {
      console.error('[DashboardComponent] Failed to save SEO settings', error);
      this.seoMessage = this.httpErrorService.resolve(error, {
        locale: 'ar',
        fallbackAr: 'تعذر حفظ الكلمات المفتاحية الآن.',
      });
      this.seoMessageType = 'error';
      this.notificationsService.error('تعذر تحديث SEO', this.seoMessage);
    } finally {
      this.seoSaving = false;
    }
  }

  async refreshOverview(): Promise<void> {
    await this.loadOverview(true);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('ar-EG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(value || 0));
  }

  formatDate(value: number | null): string {
    if (!value) return 'غير متاح';

    return new Intl.DateTimeFormat('ar-EG', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  private async loadSeoSettings(): Promise<void> {
    this.seoLoading = true;

    try {
      const snapshot = await get(ref(this.db, 'siteSettings/seo'));
      const data = (snapshot.exists() ? snapshot.val() : {}) as SeoDashboardSettings;

      this.keywordsAr = `${data?.keywordsAr || ''}`.trim();
      this.keywordsEn = `${data?.keywordsEn || ''}`.trim();
    } catch (error) {
      console.error('[DashboardComponent] Failed to load SEO settings', error);
      this.seoMessage = this.httpErrorService.resolve(error, {
        locale: 'ar',
        fallbackAr: 'تعذر تحميل إعدادات SEO الحالية.',
      });
      this.seoMessageType = 'error';
      this.notificationsService.error('تعذر تحميل SEO', this.seoMessage);
    } finally {
      this.seoLoading = false;
    }
  }

  private async loadOverview(showSuccessNotification = false): Promise<void> {
    this.overviewLoading = true;
    this.overviewError = '';

    try {
      this.overview = await this.analyticsService.loadDashboardOverview();
      if (showSuccessNotification) {
        this.notificationsService.info(
          'تم تحديث لوحة التحكم',
          'تم تحميل أحدث أرقام الاستخدام والمبيعات بنجاح.',
          3500,
        );
      }
    } catch (error) {
      console.error('[DashboardComponent] Failed to load dashboard overview', error);
      this.overviewError = this.httpErrorService.resolve(error, {
        locale: 'ar',
        fallbackAr: 'تعذر تحميل ملخص لوحة التحكم الآن.',
      });
      this.notificationsService.error('تعذر تحميل الملخص', this.overviewError);
    } finally {
      this.overviewLoading = false;
    }
  }

  private normalizeKeywords(value: string): string {
    return `${value || ''}`
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .join(', ');
  }
}
