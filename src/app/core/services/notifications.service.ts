import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: number;
  autoCloseMs: number | null;
}

export interface NotificationInput {
  type: NotificationType;
  title: string;
  message: string;
  autoCloseMs?: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationsService {
  private readonly subject = new BehaviorSubject<AppNotification[]>([]);
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  readonly notifications$ = this.subject.asObservable();

  show(input: NotificationInput): string {
    const notification: AppNotification = {
      id: this.createId(),
      type: input.type,
      title: `${input.title || ''}`.trim(),
      message: `${input.message || ''}`.trim(),
      createdAt: Date.now(),
      autoCloseMs:
        typeof input.autoCloseMs === 'number'
          ? Math.max(0, input.autoCloseMs)
          : 5000,
    };

    this.subject.next([notification, ...this.subject.value].slice(0, 4));

    if (notification.autoCloseMs && notification.autoCloseMs > 0) {
      const timer = setTimeout(() => this.dismiss(notification.id), notification.autoCloseMs);
      this.timers.set(notification.id, timer);
    }

    return notification.id;
  }

  success(title: string, message: string, autoCloseMs?: number | null): string {
    return this.show({ type: 'success', title, message, autoCloseMs });
  }

  error(title: string, message: string, autoCloseMs?: number | null): string {
    return this.show({ type: 'error', title, message, autoCloseMs });
  }

  info(title: string, message: string, autoCloseMs?: number | null): string {
    return this.show({ type: 'info', title, message, autoCloseMs });
  }

  warning(title: string, message: string, autoCloseMs?: number | null): string {
    return this.show({ type: 'warning', title, message, autoCloseMs });
  }

  dismiss(id: string): void {
    this.clearTimer(id);
    this.subject.next(this.subject.value.filter((item) => item.id !== id));
  }

  clear(): void {
    Array.from(this.timers.keys()).forEach((id) => this.clearTimer(id));
    this.subject.next([]);
  }

  private clearTimer(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }

  private createId(): string {
    return `notice-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}
