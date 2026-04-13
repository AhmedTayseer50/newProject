import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Database } from '@angular/fire/database';
import { get, query, ref, equalTo, orderByChild } from 'firebase/database';
import { EnrollmentsService } from 'src/app/core/services/enrollments.service';

export interface BillingItemSummary {
  id: string;
  itemType: 'course' | 'diploma';
  title: string;
  priceText: string;
  planName: string;
}

export interface BillingOrderSummary {
  merchantOrderId: string;
  status: 'pending' | 'paid' | 'failed';
  amount: number;
  createdAt: number;
  paidAt: number | null;
  transactionId: string | null;
  items: BillingItemSummary[];
}

export interface BillingOverview {
  isAuthenticated: boolean;
  activeCoursesCount: number;
  paidOrdersCount: number;
  totalPaidAmount: number;
  recentOrders: BillingOrderSummary[];
  hasReadError: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class SubscriptionService {
  private db = inject(Database);
  private auth = inject(Auth);
  private enrollments = inject(EnrollmentsService);

  async loadCurrentUserBilling(): Promise<BillingOverview> {
    const user = this.auth.currentUser;

    if (!user) {
      return {
        isAuthenticated: false,
        activeCoursesCount: 0,
        paidOrdersCount: 0,
        totalPaidAmount: 0,
        recentOrders: [],
        hasReadError: false,
      };
    }

    const activeCoursesPromise = this.enrollments
      .listUserEnrollments(user.uid)
      .then((items) => items.length)
      .catch(() => 0);

    try {
      const ordersQuery = query(
        ref(this.db, 'paymentOrders'),
        orderByChild('userId'),
        equalTo(user.uid),
      );

      const [ordersSnap, activeCoursesCount] = await Promise.all([
        get(ordersQuery),
        activeCoursesPromise,
      ]);

      const ordersObj = ordersSnap.exists() ? ordersSnap.val() : {};
      const recentOrders = Object.values(ordersObj || {})
        .map((raw: any) => this.normalizeOrder(raw))
        .filter(Boolean)
        .sort((a, b) => b.createdAt - a.createdAt);

      return {
        isAuthenticated: true,
        activeCoursesCount,
        paidOrdersCount: recentOrders.filter((item) => item.status === 'paid').length,
        totalPaidAmount: recentOrders
          .filter((item) => item.status === 'paid')
          .reduce((sum, item) => sum + Number(item.amount || 0), 0),
        recentOrders,
        hasReadError: false,
      };
    } catch (error) {
      console.error('[SubscriptionService] Failed to load billing overview', error);

      return {
        isAuthenticated: true,
        activeCoursesCount: await activeCoursesPromise,
        paidOrdersCount: 0,
        totalPaidAmount: 0,
        recentOrders: [],
        hasReadError: true,
      };
    }
  }

  private normalizeOrder(raw: any): BillingOrderSummary {
    const items = Array.isArray(raw?.items)
      ? raw.items.map((item: any) => ({
          id: `${item?.id || ''}`.trim(),
          itemType: item?.itemType === 'diploma' ? 'diploma' : 'course',
          title: `${item?.title || ''}`.trim(),
          priceText: `${item?.priceText || item?.price || ''}`.trim(),
          planName: `${item?.planName || ''}`.trim(),
        }))
      : [];

    return {
      merchantOrderId: `${raw?.merchantOrderId || ''}`.trim(),
      status:
        raw?.status === 'paid' || raw?.status === 'failed' ? raw.status : 'pending',
      amount: Number(raw?.amount || 0) || 0,
      createdAt: Number(raw?.createdAt || 0) || 0,
      paidAt: Number(raw?.paidAt || 0) || null,
      transactionId: raw?.transactionId ? String(raw.transactionId) : null,
      items,
    };
  }
}
