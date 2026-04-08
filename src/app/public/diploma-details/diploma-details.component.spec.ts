import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiplomaDetailsComponent } from './diploma-details.component';
import {
  componentTestImports,
  createComponentProviders,
  testSchemas,
} from 'src/app/testing/spec-helpers';

describe('DiplomaDetailsComponent', () => {
  let component: DiplomaDetailsComponent;
  let fixture: ComponentFixture<DiplomaDetailsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [...componentTestImports],
      declarations: [DiplomaDetailsComponent],
      providers: [...createComponentProviders()],
      schemas: testSchemas,
    });
    fixture = TestBed.createComponent(DiplomaDetailsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

