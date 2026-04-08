import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccessManagerComponent } from './access-manager.component';
import {
  componentTestImports,
  createComponentProviders,
  testSchemas,
} from 'src/app/testing/spec-helpers';

describe('AccessManagerComponent', () => {
  let component: AccessManagerComponent;
  let fixture: ComponentFixture<AccessManagerComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [...componentTestImports],
      declarations: [AccessManagerComponent],
      providers: [...createComponentProviders()],
      schemas: testSchemas,
    });
    fixture = TestBed.createComponent(AccessManagerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

