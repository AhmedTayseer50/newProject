import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LessonMaterialViewComponent } from './lesson-material-view.component';
import {
  componentTestImports,
  createComponentProviders,
  testSchemas,
} from 'src/app/testing/spec-helpers';

describe('LessonMaterialViewComponent', () => {
  let component: LessonMaterialViewComponent;
  let fixture: ComponentFixture<LessonMaterialViewComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [...componentTestImports],
      declarations: [LessonMaterialViewComponent],
      providers: [...createComponentProviders()],
      schemas: testSchemas,
    });
    fixture = TestBed.createComponent(LessonMaterialViewComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

