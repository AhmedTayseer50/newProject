import { Injectable, inject } from '@angular/core';
import { Database } from '@angular/fire/database';
import { get, ref } from 'firebase/database';

export interface AdminDashboardOverview {
  totalUsers: number;
  adminsCount: number;
  disabledUsersCount: number;
  totalCourses: number;
  publishedCourses: number;
  totalDiplomas: number;
  publishedDiplomas: number;
  paidOrdersCount: number;
  pendingOrdersCount: number;
  failedOrdersCount: number;
  totalRevenue: number;
  currentMonthRevenue: number;
  totalSessionRequests: number;
  newSessionRequests: number;
  totalCases: number;
  openCases: number;
  latestOrderAt: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  private db = inject(Database);

  async loadDashboardOverview(): Promise<AdminDashboardOverview> {
    const [
      usersSnap,
      coursesSnap,
      diplomasSnap,
      ordersSnap,
      sessionRequestsSnap,
      casesSnap,
    ] = await Promise.all([
      get(ref(this.db, 'users')),
      get(ref(this.db, 'courses')),
      get(ref(this.db, 'diplomas')),
      get(ref(this.db, 'paymentOrders')),
      get(ref(this.db, 'sessionRequests')),
      get(ref(this.db, 'cases')),
    ]);

    const users = this.toRecord(usersSnap.val());
    const courses = this.toRecord(coursesSnap.val());
    const diplomas = this.toRecord(diplomasSnap.val());
    const orders = this.toRecord(ordersSnap.val());
    const sessionRequests = this.toRecord(sessionRequestsSnap.val());
    const cases = this.toRecord(casesSnap.val());

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}`;

    let paidOrdersCount = 0;
    let pendingOrdersCount = 0;
    let failedOrdersCount = 0;
    let totalRevenue = 0;
    let currentMonthRevenue = 0;
    let latestOrderAt: number | null = null;

    Object.values(orders).forEach((raw: any) => {
      const status = `${raw?.status || 'pending'}`.trim().toLowerCase();
      const amount = Number(raw?.amount || 0) || 0;
      const paidAt = Number(raw?.paidAt || 0) || 0;
      const createdAt = Number(raw?.createdAt || 0) || 0;
      const primaryTimestamp = paidAt || createdAt || 0;

      if (primaryTimestamp) {
        latestOrderAt = Math.max(latestOrderAt || 0, primaryTimestamp);
      }

      if (status === 'paid') {
        paidOrdersCount += 1;
        totalRevenue += amount;

        const monthKey = this.toMonthKey(primaryTimestamp || Date.now());
        if (monthKey === currentMonthKey) {
          currentMonthRevenue += amount;
        }
        return;
      }

      if (status === 'failed') {
        failedOrdersCount += 1;
        return;
      }

      pendingOrdersCount += 1;
    });

    const adminsCount = Object.values(users).filter((user: any) => this.isAdminUser(user)).length;
    const disabledUsersCount = Object.values(users).filter((user: any) => this.isDisabledUser(user)).length;
    const publishedCourses = Object.values(courses).filter((course: any) => !!course?.published).length;
    const publishedDiplomas = Object.values(diplomas).filter((diploma: any) => !!diploma?.published).length;
    const newSessionRequests = Object.values(sessionRequests).filter(
      (request: any) => `${request?.status || 'new'}`.trim().toLowerCase() === 'new',
    ).length;
    const openCases = Object.values(cases).filter(
      (item: any) => `${item?.status || 'onhold'}`.trim().toLowerCase() !== 'processed',
    ).length;

    return {
      totalUsers: Object.keys(users).length,
      adminsCount,
      disabledUsersCount,
      totalCourses: Object.keys(courses).length,
      publishedCourses,
      totalDiplomas: Object.keys(diplomas).length,
      publishedDiplomas,
      paidOrdersCount,
      pendingOrdersCount,
      failedOrdersCount,
      totalRevenue,
      currentMonthRevenue,
      totalSessionRequests: Object.keys(sessionRequests).length,
      newSessionRequests,
      totalCases: Object.keys(cases).length,
      openCases,
      latestOrderAt: latestOrderAt || null,
    };
  }

  private toRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  }

  private isAdminUser(user: any): boolean {
    return user?.isAdmin === true || user?.admin === true || `${user?.role || ''}`.trim().toLowerCase() === 'admin';
  }

  private isDisabledUser(user: any): boolean {
    return user?.isDisabled === true || user?.disabled === true;
  }

  private toMonthKey(timestamp: number): string {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`;
  }
}
