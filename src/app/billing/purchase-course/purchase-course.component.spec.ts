import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseCourseComponent } from './purchase-course.component';
import {
  componentTestImports,
  createComponentProviders,
  testSchemas,
} from 'src/app/testing/spec-helpers';

describe('PurchaseCourseComponent', () => {
  let component: PurchaseCourseComponent;
  let fixture: ComponentFixture<PurchaseCourseComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [...componentTestImports],
      declarations: [PurchaseCourseComponent],
      providers: [...createComponentProviders()],
      schemas: testSchemas,
    });
    fixture = TestBed.createComponent(PurchaseCourseComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

