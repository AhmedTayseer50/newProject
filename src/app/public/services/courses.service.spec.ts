import { TestBed } from '@angular/core/testing';

import { CoursesService } from './courses.service';
import { createServiceProviders, serviceTestImports } from 'src/app/testing/spec-helpers';

describe('CoursesService', () => {
  let service: CoursesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [...serviceTestImports],
      providers: [...createServiceProviders(), CoursesService],
    });
    service = TestBed.inject(CoursesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

