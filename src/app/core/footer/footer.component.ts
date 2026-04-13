import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/auth/services/auth.service';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent implements OnInit {
  year = new Date().getFullYear();
  currentLang: 'ar' | 'en' = 'ar';

  constructor(public auth: AuthService) {}

  ngOnInit(): void {
    this.currentLang = this.detectLangFromPath();
  }

  get privacyLabel(): string {
    return this.currentLang === 'en' ? 'Privacy Policy' : 'سياسة الخصوصية';
  }

  get termsLabel(): string {
    return this.currentLang === 'en' ? 'Terms and Conditions' : 'الشروط والأحكام';
  }

  get refundLabel(): string {
    return this.currentLang === 'en'
      ? 'Refund and Cancellation Policy'
      : 'سياسة الاسترجاع والإلغاء';
  }

  private detectLangFromPath(): 'ar' | 'en' {
    const seg = window.location.pathname.split('/')[1];
    return seg === 'en' ? 'en' : 'ar';
  }
}
