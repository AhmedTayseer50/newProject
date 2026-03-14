import { Component, OnInit } from '@angular/core';
import { Auth } from '@angular/fire/auth';

import { AdminService } from 'src/app/admin/services/admin.service';
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

  userEnrollments: Record<string, string[]> = {};
  selectedCourse: Record<string, string> = {};

  telegramAccess: Record<string, Record<string, TelegramAccessInfo>> = {};
  grantTelegramWithCourse: Record<string, boolean> = {};

  q = '';

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

  async ngOnInit(): Promise<void> {
    this.loading = true;
    this.error = undefined;

    try {
      const currentAdminUid = this.auth.currentUser?.uid;

      await Promise.all([this.loadUsers(currentAdminUid), this.loadCourses()]);
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
