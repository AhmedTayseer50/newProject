import { TestBed } from '@angular/core/testing';

import { LessonsService } from './lessons.service';
import { createServiceProviders, serviceTestImports } from 'src/app/testing/spec-helpers';

describe('LessonsService', () => {
  let service: LessonsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [...serviceTestImports],
      providers: [...createServiceProviders(), LessonsService],
    });
    service = TestBed.inject(LessonsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

