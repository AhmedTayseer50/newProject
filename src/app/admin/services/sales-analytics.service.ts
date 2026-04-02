import { Injectable, inject } from '@angular/core';
import { Database, get, ref } from '@angular/fire/database';

export type SalesOrderStatus = 'paid' | 'failed' | 'pending';

export interface SalesOrderItem {
  id: string;
  title: string;
  planId: string;
  planName: string;
  price: number;
  priceText: string;
}

export interface SalesOrderRecord {
  merchantOrderId: string;
  status: SalesOrderStatus;
  amount: number;
  amountCents: number;
  currency: string;
  userId: string;
  userEmail: string;
  userName: string;
  userPhone: string;
  transactionId: string;
  paymentProvider: string;
  language: 'ar' | 'en';
  createdAt: number;
  paidAt: number | null;
  failedAt: number | null;
  items: SalesOrderItem[];
  courseIds: string[];
}

export interface SalesAnalyticsSummaryRow {
  key: string;
  label: string;
  revenue: number;
  ordersCount: number;
}

@Injectable({ providedIn: 'root' })
export class SalesAnalyticsService {
  private db = inject(Database);

  async getAllOrders(): Promise<SalesOrderRecord[]> {
    const snap = await get(ref(this.db, 'paymentOrders'));
    if (!snap.exists()) return [];

    const value = snap.val() as Record<string, any>;

    return Object.entries(value)
      .map(([merchantOrderId, raw]) => this.mapOrder(merchantOrderId, raw))
      .sort((a, b) => {
        const aDate = a.paidAt || a.createdAt || 0;
        const bDate = b.paidAt || b.createdAt || 0;
        return bDate - aDate;
      });
  }

  buildMonthlySummary(orders: SalesOrderRecord[]): SalesAnalyticsSummaryRow[] {
    const paidOrders = orders.filter((order) => order.status === 'paid');
    const map = new Map<string, SalesAnalyticsSummaryRow>();

    for (const order of paidOrders) {
      const date = new Date(order.paidAt || order.createdAt || Date.now());
      const year = date.getFullYear();
      const month = `${date.getMonth() + 1}`.padStart(2, '0');
      const key = `${year}-${month}`;
      const label = `${year}/${month}`;
      const current = map.get(key) || {
        key,
        label,
        revenue: 0,
        ordersCount: 0,
      };

      current.revenue += order.amount;
      current.ordersCount += 1;
      map.set(key, current);
    }

    return Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key));
  }

  buildDailySummary(orders: SalesOrderRecord[]): SalesAnalyticsSummaryRow[] {
    const paidOrders = orders.filter((order) => order.status === 'paid');
    const map = new Map<string, SalesAnalyticsSummaryRow>();

    for (const order of paidOrders) {
      const date = new Date(order.paidAt || order.createdAt || Date.now());
      const year = date.getFullYear();
      const month = `${date.getMonth() + 1}`.padStart(2, '0');
      const day = `${date.getDate()}`.padStart(2, '0');
      const key = `${year}-${month}-${day}`;
      const label = `${year}/${month}/${day}`;
      const current = map.get(key) || {
        key,
        label,
        revenue: 0,
        ordersCount: 0,
      };

      current.revenue += order.amount;
      current.ordersCount += 1;
      map.set(key, current);
    }

    return Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key));
  }

  private mapOrder(merchantOrderId: string, raw: any): SalesOrderRecord {
    const rawItems = Array.isArray(raw?.items) ? raw.items : [];
    const items: SalesOrderItem[] = rawItems.map((item: any) => ({
      id: String(item?.id || ''),
      title: this.pickText(item?.title) || this.pickText(item?.name) || 'بدون اسم',
      planId: String(item?.planId || ''),
      planName: this.pickText(item?.planName) || this.pickText(item?.plan) || 'خطة غير محددة',
      price: Number(item?.price || 0),
      priceText: this.pickText(item?.priceText) || '',
    }));

    const courseIds = raw?.courseIds && typeof raw.courseIds === 'object'
      ? Object.keys(raw.courseIds)
      : [];

    const status = String(raw?.status || 'pending').trim().toLowerCase();

    return {
      merchantOrderId,
      status: status === 'paid' || status === 'failed' ? status : 'pending',
      amount: Number(raw?.amount || 0),
      amountCents: Number(raw?.amountCents || 0),
      currency: String(raw?.currency || 'EGP'),
      userId: String(raw?.userId || ''),
      userEmail: String(raw?.userEmail || ''),
      userName: String(raw?.userName || ''),
      userPhone: String(raw?.userPhone || ''),
      transactionId: String(raw?.transactionId || ''),
      paymentProvider: String(raw?.paymentProvider || ''),
      language: String(raw?.language || 'ar').toLowerCase() === 'en' ? 'en' : 'ar',
      createdAt: Number(raw?.createdAt || 0),
      paidAt: raw?.paidAt ? Number(raw.paidAt) : null,
      failedAt: raw?.failedAt ? Number(raw.failedAt) : null,
      items,
      courseIds,
    };
  }

  private pickText(value: any): string {
    if (typeof value === 'string' || typeof value === 'number') {
      return String(value);
    }

    if (value && typeof value === 'object') {
      if (typeof value.ar === 'string' || typeof value.ar === 'number') {
        return String(value.ar);
      }
      if (typeof value.en === 'string' || typeof value.en === 'number') {
        return String(value.en);
      }
      if (typeof value.name === 'string' || typeof value.name === 'number') {
        return String(value.name);
      }
      if (typeof value.title === 'string' || typeof value.title === 'number') {
        return String(value.title);
      }
    }

    return '';
  }
}
