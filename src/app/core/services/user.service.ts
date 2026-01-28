import { Injectable, inject } from '@angular/core';
import { Auth, User } from '@angular/fire/auth';
import { Database, ref, set, update, get, child } from '@angular/fire/database';
import { UserProfileExtra } from '../models/user-profile.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private db = inject(Database);
  private auth = inject(Auth);

  /** إنشاء/تحديث سجلّ المستخدم في /users/{uid} */
  async syncUser(user: User, extra?: UserProfileExtra): Promise<void> {
    const uid = user.uid;
    const emailLower = (user.email ?? '').toLowerCase();
    const userRef = ref(this.db, `users/${uid}`);

    const snap = await get(userRef);

    // تحديد الأدوار تلقائيًا حسب الإيميل
    const shouldBeAdmin = emailLower === 'admin@gmail.com';
    const shouldBeStaff = emailLower === 'account@gmail.com';

    // اسم المستخدم: لو اتبعت في extra خده، وإلا خد من Auth
    const displayName = (extra?.displayName ?? user.displayName ?? null);

    // واتساب: لو اتبعت في extra خزّنه (مفيش whatsapp في Auth أصلاً)
    const whatsapp = (extra?.whatsapp ?? null);

    if (!snap.exists()) {
      // أول مرة: خزّن بيانات أساسية
      await set(userRef, {
        email: user.email ?? '',
        displayName,
        whatsapp,
        createdAt: Date.now(),
        isAdmin: shouldBeAdmin,
        isStaff: shouldBeStaff,
        isDisabled: false
      });
      return;
    }

    // موجود: حدّث الحقول القابلة للتغيير مع الحفاظ على الحقول الحساسة
    const data = (snap.val() ?? {}) as {
      email?: string;
      displayName?: string | null;
      whatsapp?: string | null;
      isAdmin?: boolean;
      isStaff?: boolean;
      isDisabled?: boolean;
    };

    await update(userRef, {
      // لو user.email موجود استخدمه، وإلا خليك على الموجود
      email: user.email ?? data.email ?? '',
      // لو displayName موجود (extra أو auth) حدّثه، وإلا خليك على الموجود
      displayName: displayName ?? data.displayName ?? null,
      // لو extra.whatsapp اتبعت (حتى لو فاضي) حدّثه، وإلا خليك على الموجود
      whatsapp: extra?.whatsapp !== undefined ? whatsapp : (data.whatsapp ?? null),

      // ثبّت الأدوار: لو اتعيّنت قبل كده تبقى كما هي، ولو الإيميل يطابق نفعّلها
      isAdmin: shouldBeAdmin || !!data.isAdmin,
      isStaff: shouldBeStaff || !!data.isStaff

      // لا نلمس isDisabled هنا — تُدار من شاشة الأدمن فقط
    });
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
