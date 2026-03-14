import { Injectable, inject } from '@angular/core';
import {
  Database,
  ref,
  get,
  set,
  remove,
  update,
} from '@angular/fire/database';

export interface EnrollmentInfo {
  grantedAt: number;
  grantedBy?: string | null;
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

  async listUserEnrollments(uid: string): Promise<string[]> {
    const snap = await get(ref(this.db, `enrollments/${uid}`));
    if (!snap.exists()) return [];
    const obj = snap.val() as UserEnrollments;
    return Object.keys(obj || {});
  }

  async grant(uid: string, courseId: string, adminUid?: string) {
    const value: EnrollmentInfo = {
      grantedAt: Date.now(),
      grantedBy: adminUid ?? null,
    };
    await set(ref(this.db, `enrollments/${uid}/${courseId}`), value);
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