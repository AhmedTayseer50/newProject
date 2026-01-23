import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export type CreatePlayerSessionRequest = {
  courseId: string;
  lessonId: string;
  videoProvider: 'youtube' | 'gdrive';
  videoRef: string;
  /** Firebase ID token (Bearer) */
  idToken: string;
};

export type CreatePlayerSessionResponse = {
  playerUrl: string;
  expiresAt: string;
};

@Injectable({ providedIn: 'root' })
export class PlayerSessionService {
  constructor(private http: HttpClient) {}

  createSession(payload: CreatePlayerSessionRequest): Observable<CreatePlayerSessionResponse> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${payload.idToken}`,
    });

    // ملاحظة: السيرفر بياخد التوكن من Authorization header
    // لذلك مش لازم نبعته في body
    const body = {
      courseId: payload.courseId,
      lessonId: payload.lessonId,
      videoProvider: payload.videoProvider,
      videoRef: payload.videoRef,
    };

    return this.http.post<CreatePlayerSessionResponse>('/api/player-session', body, { headers });
  }
}
