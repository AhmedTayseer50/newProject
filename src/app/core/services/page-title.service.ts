import { Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, ActivatedRoute, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class PageTitleService {
  constructor(private router: Router, private title: Title) {}

  init(): void {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        const routeTitle = this.getDeepestTitle(this.router.routerState.root);
        const appName = $localize`:@@app_name:نبضة حياة`;
        this.title.setTitle(routeTitle ? `${routeTitle} | ${appName}` : appName);
      });
  }

  private getDeepestTitle(route: ActivatedRoute): string | null {
    let current: ActivatedRoute = route;
    while (current.firstChild) current = current.firstChild;
    return current.snapshot?.data?.['title'] ?? null;
  }
}