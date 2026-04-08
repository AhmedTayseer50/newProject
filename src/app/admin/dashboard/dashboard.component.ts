import { Component, OnInit } from '@angular/core';
import { Database } from '@angular/fire/database';
import { get, ref, set } from 'firebase/database';

type SeoDashboardSettings = {
  keywordsAr?: string;
  keywordsEn?: string;
};

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  keywordsAr = '';
  keywordsEn = '';
  seoLoading = true;
  seoSaving = false;
  seoMessage = '';
  seoMessageType: 'success' | 'error' | '' = '';

  constructor(private db: Database) {}

  async ngOnInit(): Promise<void> {
    await this.loadSeoSettings();
  }

  async saveSeoSettings(): Promise<void> {
    this.seoSaving = true;
    this.seoMessage = '';
    this.seoMessageType = '';

    try {
      await set(ref(this.db, 'siteSettings/seo'), {
        keywordsAr: this.normalizeKeywords(this.keywordsAr),
        keywordsEn: this.normalizeKeywords(this.keywordsEn),
        updatedAt: Date.now(),
      });

      this.keywordsAr = this.normalizeKeywords(this.keywordsAr);
      this.keywordsEn = this.normalizeKeywords(this.keywordsEn);
      this.seoMessage = 'تم حفظ الكلمات المفتاحية بنجاح.';
      this.seoMessageType = 'success';
    } catch (error) {
      console.error('[DashboardComponent] Failed to save SEO settings', error);
      this.seoMessage = 'تعذر حفظ الكلمات المفتاحية الآن.';
      this.seoMessageType = 'error';
    } finally {
      this.seoSaving = false;
    }
  }

  private async loadSeoSettings(): Promise<void> {
    this.seoLoading = true;

    try {
      const snapshot = await get(ref(this.db, 'siteSettings/seo'));
      const data = (snapshot.exists() ? snapshot.val() : {}) as SeoDashboardSettings;

      this.keywordsAr = `${data?.keywordsAr || ''}`.trim();
      this.keywordsEn = `${data?.keywordsEn || ''}`.trim();
    } catch (error) {
      console.error('[DashboardComponent] Failed to load SEO settings', error);
      this.seoMessage = 'تعذر تحميل إعدادات SEO الحالية.';
      this.seoMessageType = 'error';
    } finally {
      this.seoLoading = false;
    }
  }

  private normalizeKeywords(value: string): string {
    return `${value || ''}`
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .join(', ');
  }
}
