import { Injectable, inject } from '@angular/core';
import {
  Database,
  ref,
  get,
  set,
  remove,
  update,
} from '@angular/fire/database';

export type EnrollmentAccessType = 'lifetime' | 'limited';
export type EnrollmentStatus = 'active' | 'suspended';

export interface EnrollmentInfo {
  grantedAt: number;
  grantedBy?: string | null;
  hideStudyMaterial?: boolean;
  planId?: string | null;
  planName?: string | null;
  accessType?: EnrollmentAccessType;
  durationDays?: number | null;
  expiresAt?: number | null;
  status?: EnrollmentStatus;
  suspendedAt?: number | null;
  suspendedBy?: string | null;
  orderId?: string | null;
  paymentProvider?: string | null;
}

export interface TelegramAccessInfo {
  enabled: boolean;
  status: 'ready' | 'used';
  grantedAt: number;
  grantedBy?: string | null;
  usedAt?: number | null;
}

export type UserEnrollments = Record<string, true | EnrollmentInfo>;

@Injectable({ providedIn: 'root' })
export class EnrollmentsService {
  private db = inject(Database);
  private readonly dayMs = 24 * 60 * 60 * 1000;

  private normalizeEnrollment(value: true | EnrollmentInfo): EnrollmentInfo {
    if (value === true) {
      return {
        grantedAt: 0,
        grantedBy: null,
        accessType: 'lifetime',
        status: 'active',
        expiresAt: null,
      };
    }

    return {
      ...value,
      accessType: value.accessType || (value.expiresAt ? 'limited' : 'lifetime'),
      status: value.status || 'active',
      expiresAt: value.expiresAt ?? null,
    };
  }

  isEnrollmentActive(value: true | EnrollmentInfo | null | undefined): boolean {
    if (!value) return false;
    if (value === true) return true;
    if (value.status === 'suspended') return false;
    if (value.expiresAt && Date.now() > value.expiresAt) return false;
    return true;
  }

  enrollmentState(
    value: true | EnrollmentInfo | null | undefined,
  ): 'none' | 'active' | 'expired' | 'suspended' {
    if (!value) return 'none';
    if (value === true) return 'active';
    if (value.status === 'suspended') return 'suspended';
    if (value.expiresAt && Date.now() > value.expiresAt) return 'expired';
    return 'active';
  }

  async getEnrollment(
    uid: string,
    courseId: string,
  ): Promise<(true | EnrollmentInfo) | null> {
    const snap = await get(ref(this.db, `enrollments/${uid}/${courseId}`));
    return snap.exists() ? (snap.val() as true | EnrollmentInfo) : null;
  }

  async getEnrollmentState(
    uid: string,
    courseId: string,
  ): Promise<'none' | 'active' | 'expired' | 'suspended'> {
    const enrollment = await this.getEnrollment(uid, courseId);
    return this.enrollmentState(enrollment);
  }

  async listUserEnrollments(uid: string): Promise<string[]> {
    const snap = await get(ref(this.db, `enrollments/${uid}`));
    if (!snap.exists()) return [];

    const obj = snap.val() as UserEnrollments;
    return Object.entries(obj || {})
      .filter(([, value]) => this.isEnrollmentActive(value))
      .map(([courseId]) => courseId);
  }

  async listUserEnrollmentInfos(uid: string): Promise<Record<string, EnrollmentInfo>> {
    const snap = await get(ref(this.db, `enrollments/${uid}`));
    if (!snap.exists()) return {};

    const obj = snap.val() as UserEnrollments;
    const result: Record<string, EnrollmentInfo> = {};

    for (const [courseId, value] of Object.entries(obj || {})) {
      result[courseId] = this.normalizeEnrollment(value);
    }

    return result;
  }

  async grant(
    uid: string,
    courseId: string,
    adminUid?: string,
    options?: {
      hideStudyMaterial?: boolean;
      planId?: string | null;
      planName?: string | null;
      orderId?: string | null;
      paymentProvider?: string | null;
      accessType?: EnrollmentAccessType;
      durationDays?: number | null;
      expiresAt?: number | null;
    },
  ) {
    const now = Date.now();
    const accessType: EnrollmentAccessType = options?.accessType || 'lifetime';
    const durationDays =
      accessType === 'limited'
        ? Math.max(1, Number(options?.durationDays || 1))
        : null;
    const expiresAt =
      accessType === 'limited'
        ? options?.expiresAt || now + Number(durationDays) * this.dayMs
        : null;

    const value: EnrollmentInfo = {
      grantedAt: now,
      grantedBy: adminUid ?? null,
      accessType,
      durationDays,
      expiresAt,
      status: 'active',
      suspendedAt: null,
      suspendedBy: null,
    };

    if (options?.hideStudyMaterial !== undefined) {
      value.hideStudyMaterial = !!options.hideStudyMaterial;
    }

    if (options?.planId !== undefined) {
      value.planId = options.planId ?? null;
    }

    if (options?.planName !== undefined) {
      value.planName = options.planName ?? null;
    }

    if (options?.orderId !== undefined) {
      value.orderId = options.orderId ?? null;
    }

    if (options?.paymentProvider !== undefined) {
      value.paymentProvider = options.paymentProvider ?? null;
    }

    await set(ref(this.db, `enrollments/${uid}/${courseId}`), value);
  }

  async suspend(uid: string, courseId: string, adminUid?: string) {
    await update(ref(this.db, `enrollments/${uid}/${courseId}`), {
      status: 'suspended',
      suspendedAt: Date.now(),
      suspendedBy: adminUid ?? null,
    });
  }

  async revoke(uid: string, courseId: string) {
    await remove(ref(this.db, `enrollments/${uid}/${courseId}`));
  }

  async touchCustomer(uid: string, email?: string | null) {
    await update(ref(this.db, `customers/${uid}`), {
      email: email ?? null,
      lastOrderAt: Date.now(),
    });
  }

  async listUserTelegramAccess(
    uid: string,
  ): Promise<Record<string, TelegramAccessInfo>> {
    const snap = await get(ref(this.db, `telegramAccess/${uid}`));
    return snap.exists()
      ? (snap.val() as Record<string, TelegramAccessInfo>)
      : {};
  }

  async grantTelegramAccess(uid: string, courseId: string, adminUid?: string) {
    const value: TelegramAccessInfo = {
      enabled: true,
      status: 'ready',
      grantedAt: Date.now(),
      grantedBy: adminUid ?? null,
      usedAt: null,
    };

    await set(ref(this.db, `telegramAccess/${uid}/${courseId}`), value);
  }

  async revokeTelegramAccess(uid: string, courseId: string) {
    await remove(ref(this.db, `telegramAccess/${uid}/${courseId}`));
  }
}
