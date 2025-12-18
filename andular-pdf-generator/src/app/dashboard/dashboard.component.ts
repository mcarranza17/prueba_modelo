import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportDataService, CompanyReport } from '../services/report-data.service';
import { PdfGeneratorComponent } from '../pdf-generator/pdf-generator.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, PdfGeneratorComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  data?: CompanyReport;

  constructor(private reportData: ReportDataService) {}

  ngOnInit(): void {
    this.reportData.loadMock().subscribe(d => this.data = d);
  }

  fmtMoney(n: number) {
    return new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  }
}

