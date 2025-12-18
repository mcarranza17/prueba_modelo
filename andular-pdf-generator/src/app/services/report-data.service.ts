import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CompanyReport {
  company: { name: string; industry: string; country: string; period: string; currency: string };
  kpis: any;
  highlights: string[];
  risks: any[];
  recommendations: any[];
  charts: { monthlyRevenue: { month: string; value: number }[] };
}

@Injectable({ providedIn: 'root' })
export class ReportDataService {
  constructor(private http: HttpClient) {}

  loadMock(): Observable<CompanyReport> {
    return this.http.get<CompanyReport>('assets/mock/company-report.json');
  }
}
