import { Component } from '@angular/core';

@Component({
  selector: 'app-subscription',
  templateUrl: './subscription.component.html',
  styleUrls: ['./subscription.component.css']
})
export class SubscriptionComponent {
  get isEnglish(): boolean {
    return window.location.pathname.startsWith('/en');
  }

  get pageDir(): 'rtl' | 'ltr' {
    return this.isEnglish ? 'ltr' : 'rtl';
  }

  get titleText(): string {
    return this.isEnglish ? 'Subscription & billing' : 'الاشتراك والفواتير';
  }

  get subtitleText(): string {
    return this.isEnglish
      ? 'This page is currently under development. Subscription details, invoices, and plan management will be added soon.'
      : 'هذه الصفحة قيد التطوير حاليًا، وسيتم إضافة تفاصيل الاشتراك والفواتير وإدارة الخطة قريبًا.';
  }
}