import { TestBed } from '@angular/core/testing';

import { PageTitleService } from './page-title.service';
import { createServiceProviders, serviceTestImports } from 'src/app/testing/spec-helpers';

describe('PageTitleService', () => {
  let service: PageTitleService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [...serviceTestImports],
      providers: [...createServiceProviders(), PageTitleService],
    });
    service = TestBed.inject(PageTitleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

