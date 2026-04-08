import { Injectable } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SeoService } from './seo.service';

@Injectable({ providedIn: 'root' })
export class PageTitleService {
  constructor(private router: Router, private seo: SeoService) {}

  init(): void {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        const current = this.getDeepestRoute(this.router.routerState.root);
        const routeTitle = current?.snapshot?.data?.['title'] ?? '';
        const seoData = current?.snapshot?.data?.['seo'] || {};

        this.seo.apply({
          title: routeTitle,
          description: seoData?.description,
          image: seoData?.image,
          type: seoData?.type,
          noindex: seoData?.noindex,
          structuredData: seoData?.structuredData,
          pathname: this.router.url,
        });
      });
  }

  private getDeepestRoute(route: ActivatedRoute): ActivatedRoute {
    let current: ActivatedRoute = route;
    while (current.firstChild) current = current.firstChild;
    return current;
  }
}
