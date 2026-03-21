import { Component } from '@angular/core';

@Component({
  selector: 'app-certificates',
  templateUrl: './certificates.component.html',
  styleUrls: ['./certificates.component.css']
})
export class CertificatesComponent {
  get isEnglish(): boolean {
    return window.location.pathname.startsWith('/en');
  }

  get pageDir(): 'rtl' | 'ltr' {
    return this.isEnglish ? 'ltr' : 'rtl';
  }

  get titleText(): string {
    return this.isEnglish ? 'Certificates' : 'الشهادات';
  }

  get subtitleText(): string {
    return this.isEnglish
      ? 'This page is currently under development and available certificates will be shown here later.'
      : 'هذه الصفحة قيد التطوير حاليًا، وسيتم عرض الشهادات المتاحة للمتدرب هنا لاحقًا.';
  }
}