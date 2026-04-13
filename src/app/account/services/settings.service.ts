import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Database } from '@angular/fire/database';
import { get, ref, update } from 'firebase/database';
import { UserService } from 'src/app/core/services/user.service';

export type PreferredTheme = 'light' | 'dark';
export type PreferredLanguage = 'ar' | 'en';

export interface UserSettingsForm {
  displayName: string;
  email: string;
  whatsapp: string;
  preferredLanguage: PreferredLanguage;
  theme: PreferredTheme;
  emailUpdates: boolean;
  whatsappUpdates: boolean;
}

export interface UserSettingsSnapshot {
  isAuthenticated: boolean;
  data: UserSettingsForm;
}

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private db = inject(Database);
  private auth = inject(Auth);
  private userService = inject(UserService);
  private readonly themeStorageKey = 'theme';
  private readonly languageStorageKey = 'preferredLanguage';

  constructor(@Inject(DOCUMENT) private document: Document) {}

  async loadCurrentUserSettings(): Promise<UserSettingsSnapshot> {
    const defaultData = this.createDefaultSettings();
    const user = this.auth.currentUser;

    if (!user) {
      return {
        isAuthenticated: false,
        data: defaultData,
      };
    }

    const [profile, settingsSnap] = await Promise.all([
      this.userService.getUserProfile(user.uid),
      get(ref(this.db, `userSettings/${user.uid}`)),
    ]);

    const settings = settingsSnap.exists() ? settingsSnap.val() : {};

    return {
      isAuthenticated: true,
      data: {
        displayName: `${profile?.displayName || ''}`.trim(),
        email: `${profile?.email || user.email || ''}`.trim(),
        whatsapp: `${profile?.whatsapp || ''}`.trim(),
        preferredLanguage:
          String(settings?.preferredLanguage || '').trim().toLowerCase() === 'en'
            ? 'en'
            : defaultData.preferredLanguage,
        theme:
          String(settings?.theme || '').trim().toLowerCase() === 'dark'
            ? 'dark'
            : defaultData.theme,
        emailUpdates: settings?.emailUpdates !== false,
        whatsappUpdates: settings?.whatsappUpdates !== false,
      },
    };
  }

  async saveCurrentUserSettings(data: UserSettingsForm): Promise<void> {
    const user = this.auth.currentUser;

    if (!user) {
      throw new Error('يجب تسجيل الدخول أولًا.');
    }

    const payload: UserSettingsForm = {
      displayName: `${data.displayName || ''}`.trim(),
      email: `${data.email || ''}`.trim(),
      whatsapp: `${data.whatsapp || ''}`.trim(),
      preferredLanguage: data.preferredLanguage === 'en' ? 'en' : 'ar',
      theme: data.theme === 'dark' ? 'dark' : 'light',
      emailUpdates: !!data.emailUpdates,
      whatsappUpdates: !!data.whatsappUpdates,
    };

    await Promise.all([
      update(ref(this.db, `users/${user.uid}`), {
        displayName: payload.displayName || null,
        whatsapp: payload.whatsapp || null,
      }),
      update(ref(this.db, `userSettings/${user.uid}`), {
        preferredLanguage: payload.preferredLanguage,
        theme: payload.theme,
        emailUpdates: payload.emailUpdates,
        whatsappUpdates: payload.whatsappUpdates,
        updatedAt: Date.now(),
      }),
    ]);

    this.applyTheme(payload.theme);
    localStorage.setItem(this.languageStorageKey, payload.preferredLanguage);
  }

  createDefaultSettings(): UserSettingsForm {
    return {
      displayName: '',
      email: '',
      whatsapp: '',
      preferredLanguage: this.detectLanguage(),
      theme: this.detectTheme(),
      emailUpdates: true,
      whatsappUpdates: true,
    };
  }

  applyTheme(theme: PreferredTheme): void {
    const normalizedTheme: PreferredTheme = theme === 'dark' ? 'dark' : 'light';
    this.document.body.classList.toggle('dark-theme', normalizedTheme === 'dark');
    localStorage.setItem(this.themeStorageKey, normalizedTheme);
  }

  private detectLanguage(): PreferredLanguage {
    const saved = String(localStorage.getItem(this.languageStorageKey) || '')
      .trim()
      .toLowerCase();

    if (saved === 'ar' || saved === 'en') {
      return saved;
    }

    return this.document.location?.pathname?.startsWith('/en') ? 'en' : 'ar';
  }

  private detectTheme(): PreferredTheme {
    const saved = String(localStorage.getItem(this.themeStorageKey) || '')
      .trim()
      .toLowerCase();

    return saved === 'dark' ? 'dark' : 'light';
  }
}
