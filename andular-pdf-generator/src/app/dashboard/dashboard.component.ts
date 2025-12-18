import {
  Component,
  OnInit,
  ViewChild,
  ChangeDetectorRef,
  NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { PdfGeneratorComponent } from '../pdf-generator/pdf-generator.component';
import { GeminiService } from '../services/gemini.service';
import {
  catchError,
  finalize,
  timeout,
  throwError,
  tap,
  take
} from 'rxjs';

type Severity = 'high' | 'medium' | 'low';

export interface CyberFeed {
  report_context: {
    from: string;
    to: string;
    totals: {
      total: number;
      by_severity: Record<Severity, number>;
    };
    top_groups: {
      by_category: { name: string; count: number }[];
      by_device: { name: string; count: number }[];
      by_user: { name: string; count: number }[];
    };
  };
  highlights: Array<{
    name: string;
    description: string;
    severity: Severity;
    occurredAt: string;
    user?: string;
    device?: string;
    product?: string;
    category?: string;
    type?: string;
    os?: string;
    status?: { read?: string; ack?: string; eventstatus?: string };
    mitre?: string[];
  }>;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, PdfGeneratorComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  feed?: CyberFeed;

  executiveReport = '';
  loading = false;
  errorMsg = '';
  loadingStep = '';

  private loadingInterval?: number;
  private hardStopTimer?: number;

  @ViewChild(PdfGeneratorComponent) pdfComp?: PdfGeneratorComponent;

  constructor(
    private http: HttpClient,
    private gemini: GeminiService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    this.http.get<CyberFeed>('mock/gemini-feed.json').subscribe({
      next: (f) => (this.feed = f),
      error: (e: HttpErrorResponse) => {
        console.error('Error cargando feed:', e);
        this.errorMsg =
          e.status === 404
            ? 'No encontré /mock/gemini-feed.json.'
            : `No pude cargar el feed (HTTP ${e.status}).`;
      },
    });
  }

  /* =========================
     HELPERS USADOS EN EL HTML
     ========================= */

  fmtDate(iso: string): string {
    try {
      return new Date(iso).toLocaleString('es-HN');
    } catch {
      return iso;
    }
  }

  sevLabel(s: Severity): string {
    if (s === 'high') return 'Alta';
    if (s === 'medium') return 'Media';
    if (s === 'low') return 'Baja';
    return s;
  }

  /* ========================= */

  generateReport(): void {
    this.errorMsg = '';
    this.executiveReport = '';

    if (!this.feed) {
      this.errorMsg = 'No hay feed cargado todavía.';
      return;
    }

    this.loading = true;
    this.loadingStep = 'Iniciando conexión con Gemini...';
    this.startLoadingMessages();

    // kill switch
    if (this.hardStopTimer) clearTimeout(this.hardStopTimer);
    this.hardStopTimer = window.setTimeout(() => {
      console.warn('[UI] Hard stop loading');
      this.stopLoading();
    }, 45000);

    const t0 = performance.now();

    this.gemini.generateExecutiveReport(this.feed).pipe(
      take(1),
      timeout(35000),
      tap((r) => {
        const ms = Math.round(performance.now() - t0);
        console.log(`[Gemini] Response in ${ms}ms`, r);
      }),
      catchError((e) => {
        if (e?.name === 'TimeoutError') {
          return throwError(() => new Error('Timeout Gemini (35s)'));
        }
        return throwError(() => e);
      }),
      finalize(() => this.stopLoading())
    ).subscribe({
      next: (r: any) => {
        const text = (r?.report ?? '').trim();
        if (!text) {
          this.errorMsg = 'Gemini devolvió texto vacío.';
          return;
        }

        this.executiveReport = text;

        setTimeout(() => {
          try {
            this.pdfComp?.generatePDF();
          } catch (e) {
            console.error('PDF error:', e);
            this.errorMsg = 'Reporte generado, pero falló el PDF.';
          }
        });
      },
      error: (e) => {
        console.error('Gemini error:', e);
        this.errorMsg = e?.message || String(e);
      }
    });
  }

  private stopLoading(): void {
    this.zone.run(() => {
      this.loading = false;
      this.loadingStep = '';
      if (this.loadingInterval) clearInterval(this.loadingInterval);
      if (this.hardStopTimer) clearTimeout(this.hardStopTimer);
      this.cdr.detectChanges();
    });
  }

  private startLoadingMessages(): void {
    const steps = [
      'Iniciando conexión con Gemini...',
      'Analizando datos del feed...',
      'Identificando patrones...',
      'Redactando reporte ejecutivo...',
      'Finalizando...'
    ];

    let i = 0;
    this.loadingStep = steps[0];

    this.loadingInterval = window.setInterval(() => {
      this.loadingStep = steps[i % steps.length];
      i++;
      this.cdr.detectChanges();
    }, 3000);
  }
}
