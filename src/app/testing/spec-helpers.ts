import { NO_ERRORS_SCHEMA, Provider } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Auth } from '@angular/fire/auth';
import { Database } from '@angular/fire/database';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from 'src/app/auth/services/auth.service';
import { SeoService } from 'src/app/core/services/seo.service';

export const componentTestImports = [
  HttpClientTestingModule,
  FormsModule,
  ReactiveFormsModule,
];

export const serviceTestImports = [
  HttpClientTestingModule,
];

export const testSchemas = [NO_ERRORS_SCHEMA];

export function createRouterSpy() {
  return jasmine.createSpyObj('Router', [
    'navigate',
    'navigateByUrl',
    'createUrlTree',
    'parseUrl',
  ]);
}

export function createActivatedRouteStub() {
  const emptyMap = convertToParamMap({});

  return {
    snapshot: {
      paramMap: emptyMap,
      queryParamMap: emptyMap,
      data: {},
      url: [],
    },
    paramMap: of(emptyMap),
    params: of({}),
    queryParamMap: of(emptyMap),
    queryParams: of({}),
    fragment: of(null),
    data: of({}),
    url: of([]),
  };
}

export function createAuthStub() {
  return {
    currentUser: null,
    onAuthStateChanged: () => () => undefined,
    onIdTokenChanged: () => () => undefined,
    beforeAuthStateChanged: () => () => undefined,
    authStateReady: () => Promise.resolve(),
    signOut: () => Promise.resolve(),
  };
}

export function createAuthServiceStub() {
  return {
    user$: of(null),
    isLoggedIn$: of(false),
    signup: jasmine.createSpy('signup'),
    login: jasmine.createSpy('login'),
    loginWithGoogle: jasmine.createSpy('loginWithGoogle'),
    logout: jasmine.createSpy('logout'),
    resetPassword: jasmine.createSpy('resetPassword'),
  };
}

export function createSeoServiceStub() {
  return {
    apply: jasmine.createSpy('apply'),
  };
}

export function createServiceProviders(extra: Provider[] = []): Provider[] {
  return [
    { provide: Router, useValue: createRouterSpy() },
    { provide: ActivatedRoute, useValue: createActivatedRouteStub() },
    { provide: Auth, useValue: createAuthStub() },
    { provide: Database, useValue: {} },
    { provide: SeoService, useValue: createSeoServiceStub() },
    ...extra,
  ];
}

export function createComponentProviders(extra: Provider[] = []): Provider[] {
  return createServiceProviders([
    { provide: AuthService, useValue: createAuthServiceStub() },
    ...extra,
  ]);
}
