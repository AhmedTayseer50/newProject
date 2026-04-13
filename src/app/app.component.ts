import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { PageTitleService } from './core/services/page-title.service';
import {
  AppNotification,
  NotificationsService,
} from './core/services/notifications.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit, OnDestroy {
  notifications: AppNotification[] = [];
  private notificationsSub?: Subscription;

  constructor(
    private pageTitle: PageTitleService,
    private notificationsService: NotificationsService,
  ) {}

  ngOnInit(): void {
    this.pageTitle.init();
    this.notificationsSub = this.notificationsService.notifications$.subscribe(
      (items) => {
        this.notifications = items;
      },
    );
  }

  ngOnDestroy(): void {
    this.notificationsSub?.unsubscribe();
  }

  dismissNotification(id: string): void {
    this.notificationsService.dismiss(id);
  }
}
