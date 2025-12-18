import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class GeminiService {
  constructor(private http: HttpClient) {}

  generateExecutiveReport(feed: any) {
    return this.http.post<{ report: string }>(
      'http://localhost:3001/api/gemini/executive-report',
      feed
    );
  }
}
