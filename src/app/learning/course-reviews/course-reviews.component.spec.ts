import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CourseReviewsComponent } from './course-reviews.component';
import {
  componentTestImports,
  createComponentProviders,
  testSchemas,
} from 'src/app/testing/spec-helpers';

describe('CourseReviewsComponent', () => {
  let component: CourseReviewsComponent;
  let fixture: ComponentFixture<CourseReviewsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [...componentTestImports],
      declarations: [CourseReviewsComponent],
      providers: [...createComponentProviders()],
      schemas: testSchemas,
    });
    fixture = TestBed.createComponent(CourseReviewsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

