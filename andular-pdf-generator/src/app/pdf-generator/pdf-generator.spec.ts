import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PdfGeneratorComponent } from './pdf-generator.component';

describe('PdfGeneratorComponent', () => {
  let component: PdfGeneratorComponent;
  let fixture: ComponentFixture<PdfGeneratorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PdfGeneratorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PdfGeneratorComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
