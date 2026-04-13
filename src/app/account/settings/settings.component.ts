import { Component, OnInit } from '@angular/core';
import {
  SettingsService,
  UserSettingsForm,
} from '../services/settings.service';
import { HttpErrorService } from 'src/app/core/services/http-error.service';
import { NotificationsService } from 'src/app/core/services/notifications.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],
})
export class SettingsComponent implements OnInit {
  loading = true;
  saving = false;
  isAuthenticated = false;
  saveMessage = '';
  saveState: 'success' | 'error' | '' = '';

  form: UserSettingsForm = {
    displayName: '',
    email: '',
    whatsapp: '',
    preferredLanguage: 'ar',
    theme: 'light',
    emailUpdates: true,
    whatsappUpdates: true,
  };

  constructor(
    private settingsService: SettingsService,
    private httpErrorService: HttpErrorService,
    private notificationsService: NotificationsService,
  ) {}

  ngOnInit(): void {
    void this.loadSettings();
  }

  get isEnglish(): boolean {
    return window.location.pathname.startsWith('/en');
  }

  get pageDir(): 'rtl' | 'ltr' {
    return this.isEnglish ? 'ltr' : 'rtl';
  }

  get eyebrowText(): string {
    return this.isEnglish ? 'Account preferences' : 'تفضيلات الحساب';
  }

  get titleText(): string {
    return this.isEnglish ? 'Settings' : 'الإعدادات';
  }

  get subtitleText(): string {
    return this.isEnglish
      ? 'Manage your profile preferences, appearance mode, and communication settings from one place.'
      : 'أدر تفضيلات الحساب، ووضع العرض، وإعدادات التواصل من مكان واحد بشكل منظم وواضح.';
  }

  get emptyTitle(): string {
    return this.isEnglish ? 'Sign in to manage your settings' : 'سجل الدخول لإدارة إعداداتك';
  }

  get emptyText(): string {
    return this.isEnglish
      ? 'Your account settings and preferences will appear here after login.'
      : 'بعد تسجيل الدخول ستظهر هنا إعدادات الحساب والتفضيلات الخاصة بك.';
  }

  async save(): Promise<void> {
    this.saving = true;
    this.saveMessage = '';
    this.saveState = '';

    try {
      await this.settingsService.saveCurrentUserSettings(this.form);
      this.saveMessage = this.isEnglish
        ? 'Your settings have been saved successfully.'
        : 'تم حفظ إعداداتك بنجاح.';
      this.saveState = 'success';
      this.notificationsService.success(
        this.isEnglish ? 'Settings updated' : 'تم تحديث الإعدادات',
        this.saveMessage,
      );
    } catch (error) {
      console.error('[SettingsComponent] Failed to save settings', error);
      this.saveMessage = this.httpErrorService.resolve(error, {
        locale: this.isEnglish ? 'en' : 'ar',
        fallbackAr: 'تعذر حفظ الإعدادات الآن.',
        fallbackEn: 'Unable to save settings right now.',
      });
      this.saveState = 'error';
      this.notificationsService.error(
        this.isEnglish ? 'Unable to save settings' : 'تعذر حفظ الإعدادات',
        this.saveMessage,
      );
    } finally {
      this.saving = false;
    }
  }

  private async loadSettings(): Promise<void> {
    this.loading = true;

    try {
      const snapshot = await this.settingsService.loadCurrentUserSettings();
      this.isAuthenticated = snapshot.isAuthenticated;
      this.form = { ...snapshot.data };
    } catch (error) {
      this.isAuthenticated = false;
      this.saveMessage = this.httpErrorService.resolve(error, {
        locale: this.isEnglish ? 'en' : 'ar',
        fallbackAr: 'تعذر تحميل إعدادات الحساب حاليًا.',
        fallbackEn: 'Unable to load account settings right now.',
      });
      this.saveState = 'error';
      this.notificationsService.error(
        this.isEnglish ? 'Unable to load settings' : 'تعذر تحميل الإعدادات',
        this.saveMessage,
      );
    } finally {
      this.loading = false;
    }
  }
}
