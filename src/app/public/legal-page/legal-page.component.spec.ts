import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LegalPageComponent } from './legal-page.component';
import {
  componentTestImports,
  createComponentProviders,
  testSchemas,
} from 'src/app/testing/spec-helpers';

describe('LegalPageComponent', () => {
  let component: LegalPageComponent;
  let fixture: ComponentFixture<LegalPageComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [...componentTestImports],
      declarations: [LegalPageComponent],
      providers: [...createComponentProviders()],
      schemas: testSchemas,
    });
    fixture = TestBed.createComponent(LegalPageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
