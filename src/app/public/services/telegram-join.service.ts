import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TelegramJoinSessionResponse {
  redirectUrl: string;
}

export interface TelegramJoinStatusResponse {
  available: boolean;
  used: boolean;
}

@Injectable({ providedIn: 'root' })
export class TelegramJoinService {
  constructor(private http: HttpClient) {}

  getStatus(
    courseId: string,
    idToken: string,
  ): Observable<TelegramJoinStatusResponse> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${idToken}`,
    });

    return this.http.post<TelegramJoinStatusResponse>(
      '/api/telegram-join-status',
      { courseId },
      { headers },
    );
  }

  createSession(
    courseId: string,
    idToken: string,
  ): Observable<TelegramJoinSessionResponse> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${idToken}`,
    });

    return this.http.post<TelegramJoinSessionResponse>(
      '/api/telegram-join-session',
      { courseId },
      { headers },
    );
  }
}
