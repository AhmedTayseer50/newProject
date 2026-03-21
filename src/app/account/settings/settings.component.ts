import { Component } from '@angular/core';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent {
  get isEnglish(): boolean {
    return window.location.pathname.startsWith('/en');
  }

  get pageDir(): 'rtl' | 'ltr' {
    return this.isEnglish ? 'ltr' : 'rtl';
  }

  get titleText(): string {
    return this.isEnglish ? 'Settings' : 'الإعدادات';
  }

  get subtitleText(): string {
    return this.isEnglish
      ? 'This page is currently under development and will be activated later.'
      : 'صفحة الإعدادات قيد التطوير حاليًا، وسيتم تفعيلها لاحقًا.';
  }
}