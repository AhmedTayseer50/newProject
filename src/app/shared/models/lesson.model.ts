export interface Lesson {
  id: string;
  courseId: string;
  title?: string | null;
  lessonIndex?: number | null;

  /** مصدر الفيديو */
  videoProvider?: 'youtube' | 'gdrive';

  /** مرجع الفيديو (YouTube videoId أو Google Drive fileId) */
  videoRef?: string | null;

  createdAt?: number | null;
  updatedAt?: number | null;
}
