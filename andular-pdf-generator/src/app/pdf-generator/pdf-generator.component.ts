import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-pdf-generator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pdf-generator.html',
  styleUrls: ['./pdf-generator.component.css'],
})
export class PdfGeneratorComponent {
  @Input() text = '';

  // Branding / configuración
  companyName = 'GLADiiUM Technology Partners';
  reportTitle = 'Reporte Ejecutivo de Ciberseguridad';
  reportYear = '2025';
  footerText = 'Dirección · Seguridad de la Información · Uso Interno';
  wineColor: [number, number, number] = [122, 0, 38]; // rojo vino

  generatePDF() {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 18;
    const marginTop = 25;
    const marginBottom = 20;
    const lineHeight = 5.5;

    /* ======================
       PORTADA
    ====================== */
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Línea vino superior
    doc.setDrawColor(...this.wineColor);
    doc.setLineWidth(1.2);
    doc.line(marginX, 20, pageWidth - marginX, 20);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(30);
    doc.text(this.companyName, marginX, 45);

    doc.setFontSize(26);
    doc.setTextColor(...this.wineColor);
    doc.text(this.reportTitle, marginX, 75, {
      maxWidth: pageWidth - marginX * 2,
    });

    doc.setFontSize(14);
    doc.setTextColor(60);
    doc.text(`Reporte ${this.reportYear}`, marginX, 95);

    doc.setFontSize(11);
    doc.setTextColor(90);
    doc.text(
      'Documento confidencial – Uso interno',
      marginX,
      pageHeight - 35
    );

    /* ======================
       CONTENIDO (Gemini)
    ====================== */
    doc.addPage();
    this.addHeader(doc, pageWidth);

    let y = marginTop + 10;
    const paragraphs = (this.text || '').split('\n');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(30);

    for (const rawLine of paragraphs) {
      const line = rawLine.trim();

      if (!line) {
        y += lineHeight * 0.7;
        continue;
      }

      // Títulos Markdown ##
      if (line.startsWith('## ')) {
        y = this.ensureSpace(doc, y, pageHeight, marginBottom);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(...this.wineColor);
        doc.text(line.replace('## ', ''), marginX, y);
        y += 8;

        doc.setDrawColor(...this.wineColor);
        doc.setLineWidth(0.4);
        doc.line(marginX, y, pageWidth - marginX, y);
        y += 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(30);
        continue;
      }

      // Bullets
      if (line.startsWith('- ') || line.startsWith('• ')) {
        y = this.ensureSpace(doc, y, pageHeight, marginBottom);
        const text = line.replace(/^(-|•)\s+/, '');
        const wrapped = doc.splitTextToSize(
          text,
          pageWidth - marginX * 2 - 6
        );

        doc.setTextColor(...this.wineColor);
        doc.text('•', marginX, y);

        doc.setTextColor(30);
        doc.text(wrapped, marginX + 5, y);
        y += wrapped.length * lineHeight;
        continue;
      }

      // Párrafo normal
      y = this.ensureSpace(doc, y, pageHeight, marginBottom);
      const wrapped = doc.splitTextToSize(
        line,
        pageWidth - marginX * 2
      );
      doc.text(wrapped, marginX, y);
      y += wrapped.length * lineHeight;
    }

    /* ======================
       ANEXOS – DISCLAIMER
    ====================== */
    doc.addPage();
    this.addHeader(doc, pageWidth);

    y = marginTop + 10;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...this.wineColor);
    doc.text('Appendix – Information Classification', marginX, y);
    y += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(30);

    const appendixText =
      '• [TLP:GREEN] Limited disclosure, recipients may disseminate within their community. ' +
      'Sources may use TLP:GREEN where the information is useful to raise awareness within their broader community. ' +
      'Recipients may share TLP:GREEN information with peers and partner organizations within their community, ' +
      'but not through publicly accessible channels.';

    const appendixWrapped = doc.splitTextToSize(
      appendixText,
      pageWidth - marginX * 2
    );
    doc.text(appendixWrapped, marginX, y);

    /* ======================
       FOOTERS + PAGINACIÓN
    ====================== */
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      this.addFooter(doc, pageWidth, pageHeight, i, totalPages);
    }

    doc.save(`Reporte_Ejecutivo_Ciberseguridad_${this.reportYear}.pdf`);
  }

  /* ======================
     Helpers visuales
  ====================== */

  private addHeader(doc: jsPDF, pageWidth: number) {
    doc.setDrawColor(...this.wineColor);
    doc.setLineWidth(0.8);
    doc.line(18, 15, pageWidth - 18, 15);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(60);
    doc.text(this.reportTitle, 18, 12);
  }

  private addFooter(
    doc: jsPDF,
    pageWidth: number,
    pageHeight: number,
    page: number,
    total: number
  ) {
    doc.setDrawColor(200);
    doc.setLineWidth(0.3);
    doc.line(18, pageHeight - 15, pageWidth - 18, pageHeight - 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.text(this.footerText, 18, pageHeight - 10);

    const pageText = `Página ${page} de ${total}`;
    const w = doc.getTextWidth(pageText);
    doc.text(pageText, pageWidth - 18 - w, pageHeight - 10);
  }

  private ensureSpace(
    doc: jsPDF,
    y: number,
    pageHeight: number,
    marginBottom: number
  ) {
    if (y < pageHeight - marginBottom) return y;
    doc.addPage();
    this.addHeader(doc, doc.internal.pageSize.getWidth());
    return 35;
  }
}
