import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConsultationBookingComponent } from './consultation-booking.component';
import {
  componentTestImports,
  createComponentProviders,
  testSchemas,
} from 'src/app/testing/spec-helpers';

describe('ConsultationBookingComponent', () => {
  let component: ConsultationBookingComponent;
  let fixture: ComponentFixture<ConsultationBookingComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [...componentTestImports],
      declarations: [ConsultationBookingComponent],
      providers: [...createComponentProviders()],
      schemas: testSchemas,
    });
    fixture = TestBed.createComponent(ConsultationBookingComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

