import { Component, OnInit } from '@angular/core';
import { Auth } from '@angular/fire/auth';

import {
  AdminPaymentOrder,
  AdminPaymentOrderItem,
  AdminService,
} from 'src/app/admin/services/admin.service';
import { UsersAdminService } from 'src/app/admin/services/users-admin.service';
import {
  EnrollmentsService,
  TelegramAccessInfo,
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
  selectedCourse: Record<string, string> = {};

  telegramAccess: Record<string, Record<string, TelegramAccessInfo>> = {};
  grantTelegramWithCourse: Record<string, boolean> = {};

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
      (user.email || '').toLowerCase().includes(keyword),
    );
  }

  get filteredPaymentOrders(): AdminPaymentOrder[] {
    const keyword = this.ordersQ.trim().toLowerCase();
    const orders = this.paymentOrders.filter(
      (order) => order.paymentProvider === 'whatsapp' || order.status === 'whatsapp_pending' || order.status === 'partially_granted',
    );

    if (!keyword) {
      return orders;
    }

    return orders.filter((order) =>
      (order.userEmail || '').toLowerCase().includes(keyword),
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
          !!user.email &&
          user.isDisabled !== true &&
          ((user.isAdmin !== true && user.isStaff !== true) ||
            user.uid === currentAdminUid),
      )
      .map((user) => ({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || undefined,
      }));
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
        const enrollments = await this.enrollSvc.listUserEnrollments(user.uid);
        const telegram = await this.enrollSvc.listUserTelegramAccess(user.uid);

        return {
          uid: user.uid,
          enrollments,
          telegram,
        };
      }),
    );

    for (const item of results) {
      this.userEnrollments[item.uid] = item.enrollments;
      this.telegramAccess[item.uid] = item.telegram || {};
    }
  }

  courseTitle(courseId: string): string {
    return (
      this.courses.find((course) => course.id === courseId)?.title || courseId
    );
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
      default:
        return order.status || 'غير محدد';
    }
  }

  isOrderCourseGranted(order: AdminPaymentOrder, courseId: string): boolean {
    return !!order.grantedCourseIds?.[courseId];
  }

  private textValue(value: any): string {
    if (typeof value === 'string' || typeof value === 'number') {
      return String(value);
    }

    if (value && typeof value === 'object') {
      return value.ar || value.en || value.title || value.name || '';
    }

    return '';
  }

  private getOrderItemForCourse(
    order: AdminPaymentOrder,
    courseId: string,
  ): AdminPaymentOrderItem | undefined {
    return (order.items || []).find((item) => {
      if (item.itemType === 'course' && item.id === courseId) {
        return true;
      }

      return Array.isArray(item.grantedCourseIds) && item.grantedCourseIds.includes(courseId);
    });
  }

  orderCourseGrantData(
    order: AdminPaymentOrder,
    courseId: string,
  ): OrderCourseGrantData {
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

      await this.enrollSvc.grant(order.userId, courseId, currentUser?.uid, {
        hideStudyMaterial: grantData.hideStudyMaterial,
        planId: grantData.planId,
        planName: grantData.planName,
        orderId: order.merchantOrderId,
        paymentProvider: order.paymentProvider || 'whatsapp',
      });
      await this.enrollSvc.touchCustomer(order.userId, order.userEmail ?? null);

      const currentEnrollments = this.userEnrollments[order.userId] || [];
      if (!currentEnrollments.includes(courseId)) {
        this.userEnrollments[order.userId] = [...currentEnrollments, courseId];
      }

      const existingGranted = {
        ...(order.grantedCourseIds || {}),
        [courseId]: true,
      };
      const allGranted = this.orderCourseIds(order).every(
        (id) => existingGranted[id] === true,
      );

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

  async grant(user: AccessUser): Promise<void> {
    const courseId = this.selectedCourse[user.uid];

    if (!courseId) {
      this.error = 'اختر كورس أولاً';
      return;
    }

    this.error = undefined;

    try {
      const currentUser = this.auth.currentUser ?? undefined;

      await this.enrollSvc.grant(user.uid, courseId, currentUser?.uid);
      await this.enrollSvc.touchCustomer(user.uid, user.email ?? null);

      const currentEnrollments = this.userEnrollments[user.uid] || [];
      if (!currentEnrollments.includes(courseId)) {
        this.userEnrollments[user.uid] = [...currentEnrollments, courseId];
      }

      if (this.grantTelegramWithCourse[user.uid]) {
        await this.enrollSvc.grantTelegramAccess(
          user.uid,
          courseId,
          currentUser?.uid,
        );

        if (!this.telegramAccess[user.uid]) {
          this.telegramAccess[user.uid] = {};
        }

        this.telegramAccess[user.uid][courseId] = {
          enabled: true,
          status: 'ready',
          grantedAt: Date.now(),
          grantedBy: currentUser?.uid ?? null,
          usedAt: null,
        };
      }

      this.selectedCourse[user.uid] = '';
      this.grantTelegramWithCourse[user.uid] = false;
    } catch (e: any) {
      this.error = e?.message ?? 'تعذر منح الصلاحية';
    }
  }

  async revoke(user: AccessUser, courseId: string): Promise<void> {
    this.error = undefined;

    try {
      await this.enrollSvc.revoke(user.uid, courseId);
      await this.enrollSvc.revokeTelegramAccess(user.uid, courseId);

      this.userEnrollments[user.uid] = (
        this.userEnrollments[user.uid] || []
      ).filter((id) => id !== courseId);

      if (this.telegramAccess[user.uid]?.[courseId]) {
        delete this.telegramAccess[user.uid][courseId];
      }
    } catch (e: any) {
      this.error = e?.message ?? 'تعذر إلغاء الصلاحية';
    }
  }

  async enableTelegram(user: AccessUser, courseId: string): Promise<void> {
    this.error = undefined;

    const hasEnrollment = (this.userEnrollments[user.uid] || []).includes(
      courseId,
    );
    if (!hasEnrollment) {
      this.error =
        'لا يمكن تفعيل زر التليجرام لمستخدم غير حاصل على صلاحية الكورس';
      return;
    }

    try {
      const currentUser = this.auth.currentUser ?? undefined;

      await this.enrollSvc.grantTelegramAccess(
        user.uid,
        courseId,
        currentUser?.uid,
      );

      if (!this.telegramAccess[user.uid]) {
        this.telegramAccess[user.uid] = {};
      }

      this.telegramAccess[user.uid][courseId] = {
        enabled: true,
        status: 'ready',
        grantedAt: Date.now(),
        grantedBy: currentUser?.uid ?? null,
        usedAt: null,
      };
    } catch (e: any) {
      this.error = e?.message ?? 'تعذر تفعيل زر التليجرام';
    }
  }

  async disableTelegram(user: AccessUser, courseId: string): Promise<void> {
    this.error = undefined;

    try {
      await this.enrollSvc.revokeTelegramAccess(user.uid, courseId);

      if (this.telegramAccess[user.uid]?.[courseId]) {
        delete this.telegramAccess[user.uid][courseId];
      }
    } catch (e: any) {
      this.error = e?.message ?? 'تعذر إلغاء زر التليجرام';
    }
  }

  telegramState(uid: string, courseId: string): 'none' | 'ready' | 'used' {
    const item = this.telegramAccess[uid]?.[courseId];

    if (!item || item.enabled !== true) {
      return 'none';
    }

    if (item.status === 'used' || !!item.usedAt) {
      return 'used';
    }

    return 'ready';
  }
}
