import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';

import { AppComponent } from './app.component';
import { PageTitleService } from './core/services/page-title.service';

describe('AppComponent', () => {
  const pageTitleSpy = jasmine.createSpyObj('PageTitleService', ['init']);

  beforeEach(() => TestBed.configureTestingModule({
    imports: [RouterTestingModule],
    declarations: [AppComponent],
    providers: [{ provide: PageTitleService, useValue: pageTitleSpy }],
    schemas: [NO_ERRORS_SCHEMA],
  }));

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should initialize the page title service on init', () => {
    const fixture = TestBed.createComponent(AppComponent);
    pageTitleSpy.init.calls.reset();
    fixture.detectChanges();
    expect(pageTitleSpy.init).toHaveBeenCalled();
  });
});
