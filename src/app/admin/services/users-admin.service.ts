import { Injectable, inject } from '@angular/core';
import { Database, ref, get, update, remove, query, orderByChild } from '@angular/fire/database';

export interface AdminUserRow {
  uid: string;
  email?: string;
  displayName?: string | null;
  whatsapp?: string | null;
  createdAt?: number;
  isAdmin?: boolean;
  isStaff?: boolean;
  isDisabled?: boolean;
}

@Injectable({ providedIn: 'root' })
export class UsersAdminService {
  private db = inject(Database);

  /** جلب كل المستخدمين */
  async listUsers(): Promise<AdminUserRow[]> {
    const q = query(ref(this.db, 'users'), orderByChild('email'));
    const snap = await get(q);

    if (!snap.exists()) return [];

    const data = snap.val() as Record<string, Omit<AdminUserRow, 'uid'>>;
    return Object.entries(data).map(([uid, u]) => ({
      uid,
      ...u
    }));
  }

  /**
   * ✅ جلب العملاء فقط
   * (مش Admin – مش Staff – مش Disabled)
   * مستخدمة في StaffCasesComponent
   */
  async listCustomers(): Promise<{ uid: string; email?: string }[]> {
    const users = await this.listUsers();

    return users
      .filter(u => !u.isAdmin && !u.isStaff && !u.isDisabled)
      .map(u => ({
        uid: u.uid,
        email: u.email
      }));
  }

  /** جعل المستخدم Admin */
  async setAdmin(uid: string, value: boolean): Promise<void> {
    await update(ref(this.db, `users/${uid}`), { isAdmin: value });
  }

  /** تعطيل / تفعيل المستخدم */
  async setDisabled(uid: string, value: boolean): Promise<void> {
    await update(ref(this.db, `users/${uid}`), { isDisabled: value });
  }

  /** تحديث بيانات المستخدم (اسم / إيميل / واتساب) */
  async updateUser(
    uid: string,
    data: {
      email?: string;
      displayName?: string | null;
      whatsapp?: string | null;
    }
  ): Promise<void> {
    await update(ref(this.db, `users/${uid}`), data);
  }

  /** حذف بيانات المستخدم من RTDB (لا يحذف Auth) */
  async deleteUserData(uid: string): Promise<void> {
    await remove(ref(this.db, `users/${uid}`));
  }
}
