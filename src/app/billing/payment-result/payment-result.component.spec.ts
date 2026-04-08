import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentResultComponent } from './payment-result.component';
import {
  componentTestImports,
  createComponentProviders,
  testSchemas,
} from 'src/app/testing/spec-helpers';

describe('PaymentResultComponent', () => {
  let component: PaymentResultComponent;
  let fixture: ComponentFixture<PaymentResultComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [...componentTestImports],
      declarations: [PaymentResultComponent],
      providers: [...createComponentProviders()],
      schemas: testSchemas,
    });
    fixture = TestBed.createComponent(PaymentResultComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

