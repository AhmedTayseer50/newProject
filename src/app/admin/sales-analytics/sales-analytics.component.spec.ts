import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalesAnalyticsComponent } from './sales-analytics.component';
import {
  componentTestImports,
  createComponentProviders,
  testSchemas,
} from 'src/app/testing/spec-helpers';

describe('SalesAnalyticsComponent', () => {
  let component: SalesAnalyticsComponent;
  let fixture: ComponentFixture<SalesAnalyticsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [...componentTestImports],
      declarations: [SalesAnalyticsComponent],
      providers: [...createComponentProviders()],
      schemas: testSchemas,
    });
    fixture = TestBed.createComponent(SalesAnalyticsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

