export interface Lesson {
  id: string;
  courseId: string;
  title?: string | null;
  lessonIndex?: number | null;
  /** مصدر الفيديو (حاليًا: youtube) */
  videoProvider?: 'youtube';
  /** مرجع الفيديو (مثلاً YouTube videoId) */
  videoRef?: string;
  createdAt?: number;
}
