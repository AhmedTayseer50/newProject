import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-consultations',
  templateUrl: './consultations.component.html',
  styleUrls: ['./consultations.component.css']
})
export class ConsultationsComponent implements OnInit {
  currentLang: 'ar' | 'en' = 'ar';

  ngOnInit(): void {
    this.currentLang = this.detectLangFromPath();
  }

  private detectLangFromPath(): 'ar' | 'en' {
    const seg = window.location.pathname.split('/')[1];
    return seg === 'en' ? 'en' : 'ar';
  }
}
