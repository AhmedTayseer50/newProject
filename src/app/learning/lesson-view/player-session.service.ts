import { Injectable } from '@angular/core';

export type CreatePlayerSessionRequest = {
  courseId: string;
  lessonId: string;
  videoProvider: 'youtube';
  videoRef: string;
  /** Firebase ID token (Bearer) */
  idToken: string;
};

export type CreatePlayerSessionResponse = {
  /** رابط اللاعب الداخلي (Vercel API) */
  playerUrl: string;
  /** وقت انتهاء الجلسة (اختياري) */
  expiresAt?: string;
};

@Injectable({
  providedIn: 'root'
})
export class PlayerSessionService {
  async createSession(req: CreatePlayerSessionRequest): Promise<CreatePlayerSessionResponse> {
    const res = await fetch('/api/player-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${req.idToken}`
      },
      body: JSON.stringify({
        courseId: req.courseId,
        lessonId: req.lessonId,
        videoProvider: req.videoProvider,
        videoRef: req.videoRef,
      })
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || 'فشل إنشاء جلسة تشغيل الفيديو');
    }

    return (await res.json()) as CreatePlayerSessionResponse;
  }
}
