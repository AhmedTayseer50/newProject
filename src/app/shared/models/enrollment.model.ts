export interface EnrollmentInfo {
  /** وقت منح الصلاحية (milliseconds since epoch) */
  grantedAt: number;
  /** UID الشخص اللي منح الصلاحية (مثلاً الأدمن) */
  grantedBy?: string;
  /** لو true: لا تظهر المادة العلمية PDF للمستخدم داخل هذا الكورس */
  hideStudyMaterial?: boolean;
  planId?: string | null;
  planName?: string | null;
}

// تمثيل الصلاحيات للمستخدم الواحد: courseId -> true أو كائن معلومات
export type UserEnrollments = Record<string, true | EnrollmentInfo>;

// تمثيل جذر الصلاحيات: uid -> (courseId -> true | info)
export type EnrollmentsRoot = Record<string, UserEnrollments>;

/** عنصر قراءة جاهز لاستخدامه في الواجهات */
export interface EnrollmentItem {
  uid: string;        // المستخدم
  courseId: string;   // الكورس
  info?: EnrollmentInfo | true; // ممكن تكون true فقط أو كائن معلومات
}
