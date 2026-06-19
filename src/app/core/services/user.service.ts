import { Injectable, inject } from '@angular/core';
import { Auth, User } from '@angular/fire/auth';
import { Database, ref, update, get, child } from '@angular/fire/database';
import { UserProfileExtra } from '../models/user-profile.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private db = inject(Database);
  private auth = inject(Auth);

  /** إنشاء/تحديث سجلّ المستخدم في /users/{uid} بدون لمس حقول الصلاحيات الحساسة */
  async syncUser(user: User, extra?: UserProfileExtra): Promise<void> {
    const uid = user.uid;
    const emailLower = (user.email ?? '').toLowerCase();
    const userRef = ref(this.db, `users/${uid}`);
    const snap = await get(userRef);
    const current = (snap.exists() ? snap.val() : {}) as {
      email?: string;
      displayName?: string | null;
      whatsapp?: string | null;
      createdAt?: number;
      isAdmin?: boolean;
      isStaff?: boolean;
      isDisabled?: boolean;
    };

    const displayName = extra?.displayName ?? user.displayName ?? current.displayName ?? null;
    const whatsapp = extra?.whatsapp !== undefined ? extra.whatsapp ?? null : current.whatsapp ?? null;

    const basePayload: Record<string, any> = {
      email: user.email ?? current.email ?? '',
      displayName,
      whatsapp,
      lastLoginAt: Date.now(),
    };

    if (!current.createdAt) {
      basePayload['createdAt'] = Date.now();
    }

    // مهم: لا نكتب isAdmin / isStaff / isDisabled للمستخدم العادي.
    // هذه الحقول تظل من شاشة الأدمن/القواعد فقط حتى لا تفشل المزامنة بسبب permission_denied.
    await update(userRef, basePayload);

    // للحسابات الإدارية القديمة/المحددة بالإيميل: نحاول تثبيت الدور بدون تعطيل تسجيل الدخول لو القواعد رفضت.
    // لو القواعد لا تسمح للمستخدم بتعديل الأدوار، سيتم تجاهلها بأمان.
    const rolePayload: Record<string, boolean> = {};
    if (emailLower === 'admin@gmail.com' && current.isAdmin !== true) {
      rolePayload['isAdmin'] = true;
    }
    if (emailLower === 'account@gmail.com' && current.isStaff !== true) {
      rolePayload['isStaff'] = true;
    }

    if (Object.keys(rolePayload).length) {
      try {
        await update(userRef, rolePayload);
      } catch {
        // الأدوار الحساسة قد تكون ممنوعة بالقواعد، وده طبيعي.
      }
    }
  }

  /** قراءة علم الأدمن */
  async isAdmin(uid: string): Promise<boolean> {
    const snap = await get(child(ref(this.db), `users/${uid}/isAdmin`));
    return snap.exists() && snap.val() === true;
  }

  /** قراءة علم الموظّف */
  async isStaff(uid: string): Promise<boolean> {
    const snap = await get(child(ref(this.db), `users/${uid}/isStaff`));
    return snap.exists() && snap.val() === true;
  }

  /** قراءة حالة التعطيل */
  async isDisabled(uid: string): Promise<boolean> {
    const snap = await get(child(ref(this.db), `users/${uid}/isDisabled`));
    return snap.exists() && snap.val() === true;
  }

  async getUserProfile(uid: string): Promise<{ displayName?: string | null; whatsapp?: string | null; email?: string } | null> {
    const userRef = ref(this.db, `users/${uid}`);
    const snap = await get(userRef);

    if (!snap.exists()) return null;

    const data = snap.val() as { displayName?: string | null; whatsapp?: string | null; email?: string };
    return {
      displayName: data.displayName ?? null,
      whatsapp: data.whatsapp ?? null,
      email: data.email ?? ''
    };
  }
}
