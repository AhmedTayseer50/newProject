import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiplomaEditorComponent } from './diploma-editor.component';
import {
  componentTestImports,
  createComponentProviders,
  testSchemas,
} from 'src/app/testing/spec-helpers';

describe('DiplomaEditorComponent', () => {
  let component: DiplomaEditorComponent;
  let fixture: ComponentFixture<DiplomaEditorComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [...componentTestImports],
      declarations: [DiplomaEditorComponent],
      providers: [...createComponentProviders()],
      schemas: testSchemas,
    });
    fixture = TestBed.createComponent(DiplomaEditorComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

