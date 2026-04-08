import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiplomasListComponent } from './diplomas-list.component';
import {
  componentTestImports,
  createComponentProviders,
  testSchemas,
} from 'src/app/testing/spec-helpers';

describe('DiplomasListComponent', () => {
  let component: DiplomasListComponent;
  let fixture: ComponentFixture<DiplomasListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [...componentTestImports],
      declarations: [DiplomasListComponent],
      providers: [...createComponentProviders()],
      schemas: testSchemas,
    });
    fixture = TestBed.createComponent(DiplomasListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

