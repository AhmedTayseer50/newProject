import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StaffCasesComponent } from './cases.component';
import {
  componentTestImports,
  createComponentProviders,
  testSchemas,
} from 'src/app/testing/spec-helpers';

describe('StaffCasesComponent', () => {
  let component: StaffCasesComponent;
  let fixture: ComponentFixture<StaffCasesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [...componentTestImports],
      declarations: [StaffCasesComponent],
      providers: [...createComponentProviders()],
      schemas: testSchemas,
    });
    fixture = TestBed.createComponent(StaffCasesComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

