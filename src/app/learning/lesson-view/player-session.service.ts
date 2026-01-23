import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export type CreatePlayerSessionRequest = {
  courseId: string;
  lessonId: string;
  videoProvider: 'youtube' | 'gdrive';
  videoRef: string;
  /** Firebase ID token (Bearer) */
  idToken: string;
};

export type CreatePlayerSessionResponse = {
  ok: boolean;
  session?: string;
  exp?: number;
  error?: string;
};

@Injectable({ providedIn: 'root' })
export class PlayerSessionService {
  constructor(private http: HttpClient) {}

  createSession(payload: CreatePlayerSessionRequest) {
    return this.http.post<CreatePlayerSessionResponse>('/api/player-session', payload);
  }
}
