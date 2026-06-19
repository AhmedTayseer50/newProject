import { Component, OnInit } from '@angular/core';
import { Auth } from '@angular/fire/auth';

import {
  AdminPaymentOrder,
  AdminPaymentOrderItem,
  AdminService,
} from 'src/app/admin/services/admin.service';
import { UsersAdminService } from 'src/app/admin/services/users-admin.service';
import {
  EnrollmentAccessType,
  EnrollmentInfo,
  EnrollmentsService,
} from 'src/app/core/services/enrollments.service';

type AccessUser = {
  uid: string;
  email?: string;
  displayName?: string;
};

type AccessCourse = {
  id: string;
  title?: string;
};

type OrderCourseGrantData = {
  hideStudyMaterial?: boolean;
  planId?: string | null;
  planName?: string | null;
};

@Component({
  selector: 'app-access-manager',
  templateUrl: './access-manager.component.html',
  styleUrls: ['./access-manager.component.css'],
})
export class AccessManagerComponent implements OnInit {
  loading = true;
  error?: string;

  users: AccessUser[] = [];
  courses: AccessCourse[] = [];
  paymentOrders: AdminPaymentOrder[] = [];

  userEnrollments: Record<string, string[]> = {};
  userEnrollmentInfos: Record<string, Record<string, EnrollmentInfo>> = {};
  selectedCourse: Record<string, string> = {};
  accessMode: Record<string, EnrollmentAccessType> = {};
  accessDays: Record<string, number> = {};
  orderAccessMode: Record<string, EnrollmentAccessType> = {};
  orderAccessDays: Record<string, number> = {};

  q = '';
  ordersQ = '';

  constructor(
    private usersSvc: UsersAdminService,
    private adminSvc: AdminService,
    private enrollSvc: EnrollmentsService,
    private auth: Auth,
  ) {}

  get filteredUsers(): AccessUser[] {
    const keyword = this.q.trim().toLowerCase();
    if (!keyword) return this.users;

    return this.users.filter((user) =>
      [user.email, user.displayName, user.uid]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword)),
    );
  }

  get filteredPaymentOrders(): AdminPaymentOrder[] {
    const keyword = this.ordersQ.trim().toLowerCase();
    const orders = this.paymentOrders.filter(
      (order) =>
        order.paymentProvider === 'whatsapp' ||
        order.status === 'whatsapp_pending' ||
        order.status === 'partially_granted',
    );

    if (!keyword) return orders;

    return orders.filter((order) =>
      [order.userEmail, order.userName, order.userPhone, order.merchantOrderId]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword)),
    );
  }

  async ngOnInit(): Promise<void> {
    this.loading = true;
    this.error = undefined;

    try {
      const currentAdminUid = this.auth.currentUser?.uid;

      await Promise.all([
        this.loadUsers(currentAdminUid),
        this.loadCourses(),
        this.loadPaymentOrders(),
      ]);
      await this.loadUserAccessData();
    } catch (e: any) {
      this.error = e?.message ?? 'تعذر التحميل';
    } finally {
      this.loading = false;
    }
  }

  private async loadUsers(currentAdminUid?: string): Promise<void> {
    const allUsers = await this.usersSvc.listUsers();

    this.users = allUsers
      .filter(
        (user) =>
          user.isDisabled !== true &&
          ((user.isAdmin !== true && user.isStaff !== true) ||
            user.uid === currentAdminUid),
      )
      .map((user) => ({
        uid: user.uid,
        email: user.email || undefined,
        displayName: user.displayName || undefined,
      }));

    for (const user of this.users) {
      this.accessMode[user.uid] = this.accessMode[user.uid] || 'lifetime';
      this.accessDays[user.uid] = this.accessDays[user.uid] || 30;
    }
  }

  private async loadCourses(): Promise<void> {
    const rawCourses = await this.adminSvc.listCourses();

    this.courses = rawCourses.map((course) => ({
      id: course.id,
      title: course.title?.ar || course.title?.en || '',
    }));
  }

  private async loadPaymentOrders(): Promise<void> {
    this.paymentOrders = await this.adminSvc.listPaymentOrders();
  }

  private async loadUserAccessData(): Promise<void> {
    const results = await Promise.all(
      this.users.map(async (user) => {
        const enrollmentInfos = await this.enrollSvc.listUserEnrollmentInfos(user.uid);
        return {
          uid: user.uid,
          enrollmentInfos,
          enrollments: Object.keys(enrollmentInfos || {}),
        };
      }),
    );

    for (const item of results) {
      this.userEnrollments[item.uid] = item.enrollments;
      this.userEnrollmentInfos[item.uid] = item.enrollmentInfos;
    }
  }

  courseTitle(courseId: string): string {
    return this.courses.find((course) => course.id === courseId)?.title || courseId;
  }

  userLabel(user: AccessUser): string {
    return user.displayName || user.email || user.uid;
  }

  orderCourseIds(order: AdminPaymentOrder): string[] {
    return Object.keys(order.courseIds || {}).filter(Boolean);
  }

  orderStatusLabel(order: AdminPaymentOrder): string {
    switch (order.status) {
      case 'processed':
        return 'تمت المعالجة';
      case 'partially_granted':
        return 'تم منح جزء من الطلب';
      case 'whatsapp_pending':
        return 'طلب واتساب جديد';
      case 'pending':
        return 'قيد الانتظار';
      case 'cancelled':
        return 'ملغي';
      case 'onhold':
        return 'معلق';
      default:
        return order.status || 'غير محدد';
    }
  }

  isOrderCourseGranted(order: AdminPaymentOrder, courseId: string): boolean {
    return !!order.grantedCourseIds?.[courseId];
  }

  orderAccessKey(order: AdminPaymentOrder, courseId: string): string {
    return `${order.merchantOrderId}_${courseId}`;
  }

  getOrderAccessMode(order: AdminPaymentOrder, courseId: string): EnrollmentAccessType {
    const key = this.orderAccessKey(order, courseId);
    return this.orderAccessMode[key] || 'lifetime';
  }

  setOrderAccessMode(
    order: AdminPaymentOrder,
    courseId: string,
    mode: EnrollmentAccessType,
  ): void {
    this.orderAccessMode[this.orderAccessKey(order, courseId)] = mode;
  }

  getOrderAccessDays(order: AdminPaymentOrder, courseId: string): number {
    const key = this.orderAccessKey(order, courseId);
    return this.orderAccessDays[key] || 30;
  }

  setOrderAccessDays(order: AdminPaymentOrder, courseId: string, value: any): void {
    const key = this.orderAccessKey(order, courseId);
    this.orderAccessDays[key] = Math.max(1, Number(value || 1));
  }

  enrollmentInfo(uid: string, courseId: string): EnrollmentInfo | undefined {
    return this.userEnrollmentInfos[uid]?.[courseId];
  }

  enrollmentBadge(uid: string, courseId: string): string {
    const info = this.enrollmentInfo(uid, courseId);
    if (!info) return 'غير معروف';
    if (info.status === 'suspended') return 'معلق';
    if (info.expiresAt && Date.now() > info.expiresAt) return 'منتهي';
    if (info.accessType === 'limited') return 'مؤقت';
    return 'مدى الحياة';
  }

  enrollmentExpiryLabel(uid: string, courseId: string): string {
    const info = this.enrollmentInfo(uid, courseId);
    if (!info) return '';
    if (info.accessType === 'limited' && info.expiresAt) {
      return `ينتهي في ${new Date(info.expiresAt).toLocaleDateString('ar-EG')}`;
    }
    return 'بدون حد زمني';
  }

  private buildAccessOptions(
    mode: EnrollmentAccessType,
    days: number,
  ): Pick<EnrollmentInfo, 'accessType' | 'durationDays' | 'expiresAt'> {
    const safeDays = Math.max(1, Number(days || 1));
    return {
      accessType: mode,
      durationDays: mode === 'limited' ? safeDays : null,
      expiresAt: mode === 'limited' ? Date.now() + safeDays * 24 * 60 * 60 * 1000 : null,
    };
  }

  private textValue(value: any): string {
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (value && typeof value === 'object') return value.ar || value.en || value.title || value.name || '';
    return '';
  }

  private getOrderItemForCourse(
    order: AdminPaymentOrder,
    courseId: string,
  ): AdminPaymentOrderItem | undefined {
    return (order.items || []).find((item) => {
      if (item.itemType === 'course' && item.id === courseId) return true;
      return Array.isArray(item.grantedCourseIds) && item.grantedCourseIds.includes(courseId);
    });
  }

  orderCourseGrantData(order: AdminPaymentOrder, courseId: string): OrderCourseGrantData {
    const item = this.getOrderItemForCourse(order, courseId);

    return {
      hideStudyMaterial: item?.hideStudyMaterial === true,
      planId: item?.planId || null,
      planName: this.textValue(item?.planName) || null,
    };
  }

  orderCoursePlanLabel(order: AdminPaymentOrder, courseId: string): string {
    const data = this.orderCourseGrantData(order, courseId);
    return data.planName || data.planId || '—';
  }

  async grantOrderCourse(order: AdminPaymentOrder, courseId: string): Promise<void> {
    if (!order.userId || !courseId) {
      this.error = 'بيانات الطلب غير مكتملة';
      return;
    }

    this.error = undefined;

    try {
      const currentUser = this.auth.currentUser ?? undefined;
      const grantData = this.orderCourseGrantData(order, courseId);
      const mode = this.getOrderAccessMode(order, courseId);
      const days = this.getOrderAccessDays(order, courseId);

      await this.enrollSvc.grant(order.userId, courseId, currentUser?.uid, {
        hideStudyMaterial: grantData.hideStudyMaterial,
        planId: grantData.planId,
        planName: grantData.planName,
        orderId: order.merchantOrderId,
        paymentProvider: order.paymentProvider || 'whatsapp',
        ...this.buildAccessOptions(mode, days),
      });
      await this.enrollSvc.touchCustomer(order.userId, order.userEmail ?? null);

      await this.refreshUserEnrollment(order.userId);

      const existingGranted = { ...(order.grantedCourseIds || {}), [courseId]: true };
      const allGranted = this.orderCourseIds(order).every((id) => existingGranted[id] === true);

      await this.adminSvc.markPaymentOrderCourseGranted(
        order.merchantOrderId,
        courseId,
        allGranted,
        currentUser?.uid,
      );

      order.grantedCourseIds = existingGranted;
      order.status = allGranted ? 'processed' : 'partially_granted';
      if (allGranted) {
        order.processedAt = Date.now();
        order.processedBy = currentUser?.uid ?? null;
      }
    } catch (e: any) {
      this.error = e?.message ?? 'تعذر منح صلاحية الكورس من الطلب';
    }
  }

  async refreshOrders(): Promise<void> {
    this.error = undefined;

    try {
      await this.loadPaymentOrders();
    } catch (e: any) {
      this.error = e?.message ?? 'تعذر تحديث الطلبات';
    }
  }

  async editOrderStatus(order: AdminPaymentOrder): Promise<void> {
    const nextStatus = window.prompt(
      'اكتب حالة الطلب الجديدة: whatsapp_pending / partially_granted / processed / onhold / cancelled',
      order.status || 'whatsapp_pending',
    );

    if (!nextStatus) return;

    this.error = undefined;
    try {
      await this.adminSvc.updatePaymentOrder(order.merchantOrderId, {
        status: nextStatus.trim(),
      });
      order.status = nextStatus.trim();
    } catch (e: any) {
      this.error = e?.message ?? 'تعذر تعديل حالة الطلب';
    }
  }

  async deleteOrder(order: AdminPaymentOrder): Promise<void> {
    const ok = window.confirm('هل أنت متأكد من حذف طلب الواتساب بالكامل؟');
    if (!ok) return;

    this.error = undefined;
    try {
      await this.adminSvc.deletePaymentOrder(order.merchantOrderId);
      this.paymentOrders = this.paymentOrders.filter(
        (item) => item.merchantOrderId !== order.merchantOrderId,
      );
    } catch (e: any) {
      this.error = e?.message ?? 'تعذر حذف الطلب';
    }
  }

  async grant(user: AccessUser): Promise<void> {
    const courseId = this.selectedCourse[user.uid];

    if (!courseId) {
      this.error = 'اختر كورس أولاً';
      return;
    }

    this.error = undefined;

    try {
      const currentUser = this.auth.currentUser ?? undefined;
      const mode = this.accessMode[user.uid] || 'lifetime';
      const days = this.accessDays[user.uid] || 30;

      await this.enrollSvc.grant(user.uid, courseId, currentUser?.uid, {
        ...this.buildAccessOptions(mode, days),
      });
      await this.enrollSvc.touchCustomer(user.uid, user.email ?? null);

      await this.refreshUserEnrollment(user.uid);
      this.selectedCourse[user.uid] = '';
    } catch (e: any) {
      this.error = e?.message ?? 'تعذر منح الصلاحية';
    }
  }

  async suspend(user: AccessUser, courseId: string): Promise<void> {
    const ok = window.confirm('هل تريد تعليق وصول هذا المستخدم للكورس؟');
    if (!ok) return;

    this.error = undefined;
    try {
      await this.enrollSvc.suspend(user.uid, courseId, this.auth.currentUser?.uid);
      await this.refreshUserEnrollment(user.uid);
    } catch (e: any) {
      this.error = e?.message ?? 'تعذر تعليق الاشتراك';
    }
  }

  async suspendOrderCourse(order: AdminPaymentOrder, courseId: string): Promise<void> {
    if (!order.userId) {
      this.error = 'لا يوجد userId داخل الطلب';
      return;
    }

    const ok = window.confirm('هل تريد تعليق وصول هذا المستخدم لهذا الكورس؟');
    if (!ok) return;

    this.error = undefined;
    try {
      await this.enrollSvc.suspend(order.userId, courseId, this.auth.currentUser?.uid);
      await this.refreshUserEnrollment(order.userId);
    } catch (e: any) {
      this.error = e?.message ?? 'تعذر تعليق الاشتراك';
    }
  }

  async revoke(user: AccessUser, courseId: string): Promise<void> {
    const ok = window.confirm('هل تريد حذف صلاحية هذا الكورس من المستخدم؟');
    if (!ok) return;

    this.error = undefined;

    try {
      await this.enrollSvc.revoke(user.uid, courseId);
      await this.enrollSvc.revokeTelegramAccess(user.uid, courseId);
      await this.refreshUserEnrollment(user.uid);
    } catch (e: any) {
      this.error = e?.message ?? 'تعذر إلغاء الصلاحية';
    }
  }

  private async refreshUserEnrollment(uid: string): Promise<void> {
    const infos = await this.enrollSvc.listUserEnrollmentInfos(uid);
    this.userEnrollmentInfos[uid] = infos;
    this.userEnrollments[uid] = Object.keys(infos || {});
  }
}
