import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CompetencePayload {
  nom: string;
  type: string;
  description: string;
}

export interface CompetenceItem extends CompetencePayload {
  id: number;
}

@Injectable({
  providedIn: 'root'
})
export class CompetenceService {
  private readonly http = inject(HttpClient);
  private readonly publicApiUrl = 'http://localhost:8081/api/competences';
  private readonly adminApiUrl = 'http://localhost:8081/api/admin/competences';

  getCompetences(query = '', type = ''): Observable<CompetenceItem[]> {
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set('query', query.trim());
    }
    if (type.trim()) {
      params.set('type', type.trim());
    }

    const suffix = params.toString() ? `?${params.toString()}` : '';
    return this.http.get<CompetenceItem[]>(`${this.publicApiUrl}${suffix}`);
  }

  getAdminCompetences(query = '', type = ''): Observable<CompetenceItem[]> {
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set('query', query.trim());
    }
    if (type.trim()) {
      params.set('type', type.trim());
    }

    const suffix = params.toString() ? `?${params.toString()}` : '';
    return this.http.get<CompetenceItem[]>(`${this.adminApiUrl}${suffix}`);
  }

  createCompetence(payload: CompetencePayload): Observable<CompetenceItem> {
    return this.http.post<CompetenceItem>(this.adminApiUrl, payload);
  }

  updateCompetence(id: number, payload: CompetencePayload): Observable<CompetenceItem> {
    return this.http.put<CompetenceItem>(`${this.adminApiUrl}/${id}`, payload);
  }

  deleteCompetence(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.adminApiUrl}/${id}`);
  }
}
