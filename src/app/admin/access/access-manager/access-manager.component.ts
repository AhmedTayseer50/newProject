import { Component, OnInit } from '@angular/core';
import { UsersAdminService } from 'src/app/admin/services/users-admin.service';
import { AdminService } from 'src/app/admin/services/admin.service';
import { EnrollmentsService } from 'src/app/core/services/enrollments.service';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-access-manager',
  templateUrl: './access-manager.component.html',
  styleUrls: ['./access-manager.component.css'],
})
export class AccessManagerComponent implements OnInit {
  loading = true;
  error?: string;

  // المستخدمون (بعد فلترة: ليس admin/staff/disabled) + السماح للأدمن الحالي بالظهور
  users: { uid: string; email?: string }[] = [];

  // الكورسات لعرضها في القوائم
  courses: { id: string; title?: string }[] = [];

  // لكل مستخدم → قائمة IDs الكورسات الممنوحة
  userEnrollments: Record<string, string[]> = {};

  // اختيار الكورس لكل مستخدم
  selectedCourse: Record<string, string> = {};

  // بحث بالبريد
  q = '';
  get filteredUsers() {
    const k = this.q.trim().toLowerCase();
    if (!k) return this.users;
    return this.users.filter((u) => (u.email || '').toLowerCase().includes(k));
  }

  constructor(
    private usersSvc: UsersAdminService,
    private adminSvc: AdminService,
    private enrollSvc: EnrollmentsService,
    private auth: Auth,
  ) {}

  async ngOnInit() {
    this.loading = true;
    this.error = undefined;

    try {
      // ✅ UID الأدمن الحالي (عشان نسمح بظهوره حتى لو isAdmin=true)
      const currentAdminUid = this.auth.currentUser?.uid;

      // 1) جلب كل المستخدمين ثم فلترة:
      // - استبعد disabled
      // - استبعد admin/staff
      // - لكن اسمح بظهور الأدمن الحالي فقط
      const all = await this.usersSvc.listUsers();
      this.users = all
        .filter(
          (u) =>
            !!u.email &&
            u.isDisabled !== true &&
            ((u.isAdmin !== true && u.isStaff !== true) ||
              u.uid === currentAdminUid), // 👈 السماح للأدمن الحالي بالظهور
        )
        .map((u) => ({ uid: u.uid, email: u.email }));

      // 2) جلب كل الكورسات
      const rawCourses = await this.adminSvc.listCourses();
      this.courses = rawCourses.map((c) => ({
        id: c.id,
        title: c.title?.ar || c.title?.en || '',
      }));

      // 3) تحميل صلاحيات كل مستخدم (متوازيًا لسرعة أفضل)
      const pairs = await Promise.all(
        this.users.map(async (u) => {
          const list = await this.enrollSvc.listUserEnrollments(u.uid);
          return [u.uid, list] as const;
        }),
      );

      for (const [uid, list] of pairs) {
        this.userEnrollments[uid] = list;
      }
    } catch (e: any) {
      this.error = e?.message ?? 'تعذر التحميل';
    } finally {
      this.loading = false;
    }
  }

  courseTitle(id: string): string {
    return this.courses.find((c) => c.id === id)?.title || id;
  }

  async grant(u: { uid: string; email?: string }) {
    const courseId = this.selectedCourse[u.uid];
    if (!courseId) {
      this.error = 'اختر كورس أولاً';
      return;
    }
    this.error = undefined;

    try {
      const me = this.auth.currentUser ?? undefined;

      // منح الوصول
      await this.enrollSvc.grant(u.uid, courseId, me?.uid);

      // توكيد وجود سجل العميل وتحديث آخر نشاط
      await this.enrollSvc.touchCustomer(u.uid, u.email ?? null);

      // تحديث الواجهة
      const list = this.userEnrollments[u.uid] || [];
      if (!list.includes(courseId)) list.push(courseId);
      this.userEnrollments[u.uid] = [...list];
      this.selectedCourse[u.uid] = '';
    } catch (e: any) {
      this.error = e?.message ?? 'تعذر منح الصلاحية';
    }
  }

  async revoke(u: { uid: string }, courseId: string) {
    this.error = undefined;
    try {
      await this.enrollSvc.revoke(u.uid, courseId);
      this.userEnrollments[u.uid] = (this.userEnrollments[u.uid] || []).filter(
        (x) => x !== courseId,
      );
    } catch (e: any) {
      this.error = e?.message ?? 'تعذر إلغاء الصلاحية';
    }
  }
}
