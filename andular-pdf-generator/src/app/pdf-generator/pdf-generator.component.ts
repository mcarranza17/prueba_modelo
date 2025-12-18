import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import jsPDF from 'jspdf';
import { CompanyReport } from '../services/report-data.service';

@Component({
  selector: 'app-pdf-generator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pdf-generator.html',
  styleUrls: ['./pdf-generator.component.css'],
})
export class PdfGeneratorComponent {
  @Input() text = '';

generatePDF() {
  const doc = new jsPDF();
  const lines = doc.splitTextToSize(this.text, 180);
  doc.text(lines, 15, 20);
  doc.save('Reporte_Ejecutivo_Seguridad.pdf');
}}
