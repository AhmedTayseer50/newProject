import { Component, OnInit } from '@angular/core';
import {
  BillingOrderSummary,
  BillingOverview,
  SubscriptionService,
} from '../services/subscription.service';

@Component({
  selector: 'app-subscription',
  templateUrl: './subscription.component.html',
  styleUrls: ['./subscription.component.css'],
})
export class SubscriptionComponent implements OnInit {
  loading = true;
  overview: BillingOverview = {
    isAuthenticated: false,
    activeCoursesCount: 0,
    paidOrdersCount: 0,
    totalPaidAmount: 0,
    recentOrders: [],
    hasReadError: false,
  };

  constructor(private subscriptionService: SubscriptionService) {}

  ngOnInit(): void {
    void this.loadBilling();
  }

  get isEnglish(): boolean {
    return window.location.pathname.startsWith('/en');
  }

  get pageDir(): 'rtl' | 'ltr' {
    return this.isEnglish ? 'ltr' : 'rtl';
  }

  get titleText(): string {
    return this.isEnglish ? 'Subscription & billing' : 'الاشتراك والفواتير';
  }

  get subtitleText(): string {
    return this.isEnglish
      ? 'Track your recent purchases, active learning access, and billing status from one dashboard.'
      : 'تابع مشترياتك الأخيرة، ووصولك النشط للمحتوى، وحالة المدفوعات من لوحة واحدة واضحة.';
  }

  get emptyTitle(): string {
    return this.isEnglish ? 'No billing records yet' : 'لا توجد سجلات فوترة بعد';
  }

  get emptyText(): string {
    return this.isEnglish
      ? 'Your paid orders and billing activity will appear here once you complete a purchase.'
      : 'ستظهر هنا الطلبات المدفوعة وسجل الفوترة بمجرد إتمام أي عملية شراء.';
  }

  get authTitle(): string {
    return this.isEnglish ? 'Sign in to view billing' : 'سجل الدخول لعرض الفوترة';
  }

  get authText(): string {
    return this.isEnglish
      ? 'Billing details are linked to your account and become available after login.'
      : 'بيانات الفوترة مرتبطة بحسابك وتظهر هنا بعد تسجيل الدخول.';
  }

  get totalPaidText(): string {
    const amount = this.overview.totalPaidAmount || 0;
    return this.isEnglish ? `${amount} EGP` : `${amount} جنيه`;
  }

  orderStatusLabel(order: BillingOrderSummary): string {
    if (this.isEnglish) {
      if (order.status === 'paid') return 'Paid';
      if (order.status === 'failed') return 'Failed';
      return 'Pending';
    }

    if (order.status === 'paid') return 'مدفوع';
    if (order.status === 'failed') return 'فشل';
    return 'قيد المعالجة';
  }

  formatDate(timestamp: number | null): string {
    if (!timestamp) {
      return this.isEnglish ? 'Not available' : 'غير متاح';
    }

    return new Intl.DateTimeFormat(this.isEnglish ? 'en' : 'ar', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(timestamp));
  }

  private async loadBilling(): Promise<void> {
    this.loading = true;

    try {
      this.overview = await this.subscriptionService.loadCurrentUserBilling();
    } finally {
      this.loading = false;
    }
  }
}
