// src/app/core/navbar/navbar.component.ts
import { Component, OnDestroy, OnInit, isDevMode } from '@angular/core';
import { of, Subscription, switchMap, catchError, from } from 'rxjs';
import { Router } from '@angular/router';

import { AuthService } from 'src/app/auth/services/auth.service';
import { UserService } from 'src/app/core/services/user.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
  constructor(
    public auth: AuthService,
    private userSvc: UserService,
    private router: Router
  ) {}

  isAdmin = false;
  isDisabled = false;
  isStaff = false;

  greetingName = '';

  isMenuOpen = false;

  // ✅ Dropdown for logged-in user menu
  isUserMenuOpen = false;

  // Theme
  isDarkTheme = false;
  private readonly THEME_KEY = 'theme';

  // Language
  currentLang: 'ar' | 'en' = 'ar';

  private sub?: Subscription;
  private profileSub?: Subscription;

  ngOnInit(): void {
    this.initTheme();
    this.currentLang = this.detectLangFromPath();

    this.sub = this.auth.user$.pipe(
      switchMap(user => {
        if (!user) return of({ isAdmin: false, isDisabled: false, isStaff: false });

        return Promise.all([
          this.userSvc.isAdmin(user.uid),
          this.userSvc.isDisabled(user.uid),
          this.userSvc.isStaff(user.uid)
        ]).then(([isAdmin, isDisabled, isStaff]) => ({ isAdmin, isDisabled, isStaff }));
      }),
      catchError(() => of({ isAdmin: false, isDisabled: false, isStaff: false }))
    ).subscribe(roles => {
      this.isAdmin = roles.isAdmin;
      this.isDisabled = roles.isDisabled;
      this.isStaff = roles.isStaff;
    });

    this.profileSub = this.auth.user$
      .pipe(
        switchMap((user) => {
          if (!user) return of(null);
          return from(this.userSvc.getUserProfile(user.uid)).pipe(catchError(() => of(null)));
        })
      )
      .subscribe((p) => {
        const name = (p?.displayName || '').trim();
        this.greetingName = name || '';
      });
  }

  private detectLangFromPath(): 'ar' | 'en' {
    const seg = window.location.pathname.split('/')[1];
    return seg === 'en' ? 'en' : 'ar';
  }

  private initTheme(): void {
    const saved = (localStorage.getItem(this.THEME_KEY) || 'light').toLowerCase();
    this.isDarkTheme = saved === 'dark';
    this.applyThemeClass();
  }

  toggleTheme(): void {
    this.isDarkTheme = !this.isDarkTheme;
    localStorage.setItem(this.THEME_KEY, this.isDarkTheme ? 'dark' : 'light');
    this.applyThemeClass();
  }

  private applyThemeClass(): void {
    document.body.classList.toggle('dark-theme', this.isDarkTheme);
  }

  switchLanguage(): void {
    const nextLang = this.currentLang === 'ar' ? 'en' : 'ar';
    const { pathname, search, hash } = window.location;

    const parts = pathname.split('/');
    const first = parts[1];

    let restPath = pathname;

    if (first === 'ar' || first === 'en') {
      restPath = '/' + parts.slice(2).join('/');
      if (restPath === '/' || restPath === '') restPath = '/';
    }

    const newUrl = `/${nextLang}${restPath}${search}${hash}`;

    if (isDevMode()) {
      const port = nextLang === 'en' ? '4201' : '4200';
      const host = window.location.hostname;
      const protocol = window.location.protocol;
      window.location.assign(`${protocol}//${host}:${port}${newUrl}`);
    } else {
      window.location.assign(newUrl);
    }
  }

  // ✅ Toggle logged-in dropdown
  toggleUserMenu(): void {
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  closeUserMenu(): void {
    this.isUserMenuOpen = false;
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.profileSub?.unsubscribe();
  }

  async onLogout() {
    await this.auth.logout();
    this.isMenuOpen = false;
    this.isUserMenuOpen = false;
    this.router.navigateByUrl('/');
  }
}
