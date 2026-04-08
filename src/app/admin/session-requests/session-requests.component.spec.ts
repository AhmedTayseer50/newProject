import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SessionRequestsComponent } from './session-requests.component';
import {
  componentTestImports,
  createComponentProviders,
  testSchemas,
} from 'src/app/testing/spec-helpers';

describe('SessionRequestsComponent', () => {
  let component: SessionRequestsComponent;
  let fixture: ComponentFixture<SessionRequestsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [...componentTestImports],
      declarations: [SessionRequestsComponent],
      providers: [...createComponentProviders()],
      schemas: testSchemas,
    });
    fixture = TestBed.createComponent(SessionRequestsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

