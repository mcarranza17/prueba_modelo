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
  @Input() report!: CompanyReport;

  executiveText = `Cargando...`;

  // Por ahora: mock de texto (luego lo reemplazas por Gemini)
  ngOnInit() {
    const d = this.report;
    this.executiveText =
`REPORTE EJECUTIVO — ${d.company.name} (${d.company.period})

Resumen:
- Ingresos: ${d.kpis.revenue.value}
- Margen bruto: ${d.kpis.grossMarginPct.value}%
- Utilidad neta: ${d.kpis.netProfit.value}

Highlights:
${d.highlights.map(x => `- ${x}`).join('\n')}

Riesgos:
${d.risks.map(r => `- ${r.title} (${r.severity}) — ${r.mitigation}`).join('\n')}

Recomendaciones:
${d.recommendations.map(a => `- ${a.title} (Impacto: ${a.impact}, Esfuerzo: ${a.effort})`).join('\n')}
`;
  }

  generatePDF() {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);

    const lines = doc.splitTextToSize(this.executiveText, 180);
    doc.text(lines, 15, 20);

    doc.save(`Reporte_Ejecutivo_${this.report.company.name.replace(/\s+/g,'_')}.pdf`);
  }
}
