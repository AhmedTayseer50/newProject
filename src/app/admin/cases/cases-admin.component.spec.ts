import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Database } from '@angular/fire/database';
import { Auth } from '@angular/fire/auth';

import { AdminCasesComponent } from './cases-admin.component';
import { CasesService } from '../services/cases.service';
import { AdminService } from '../services/admin.service';

describe('AdminCasesComponent', () => {
  let component: AdminCasesComponent;
  let fixture: ComponentFixture<AdminCasesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AdminCasesComponent],
      providers: [
        { provide: CasesService, useValue: jasmine.createSpyObj('CasesService', ['listAll', 'sumProcessedAmount', 'markProcessed']) },
        { provide: AdminService, useValue: jasmine.createSpyObj('AdminService', ['listCourses']) },
        { provide: Database, useValue: {} },
        { provide: Auth, useValue: { currentUser: null } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });

    fixture = TestBed.createComponent(AdminCasesComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
