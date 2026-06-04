import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface RecruiterCompanyProfile {
  idEntreprise: number | null;
  nomEntreprise: string;
  secteur: string;
  adresse: string;
  email: string;
  abonnementActif: string;
  description: string;
  siteWeb: string;
  profileCompleted: boolean;
}

export interface RecruiterCompanyPayload {
  idEntreprise: number | null;
  nomEntreprise: string;
  secteur: string;
  adresse: string;
  email: string;
  abonnementActif: string;
  description: string;
  siteWeb: string;
}

@Injectable({
  providedIn: 'root'
})
export class RecruiterCompanyService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8081/api/recruiter/company-profile';

  getCompanyProfile(): Observable<RecruiterCompanyProfile> {
    return this.http.get<RecruiterCompanyProfile>(this.apiUrl).pipe(
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error, "Chargement du profil entreprise impossible.")))
      )
    );
  }

  updateCompanyProfile(payload: RecruiterCompanyPayload): Observable<RecruiterCompanyProfile> {
    return this.http.put<RecruiterCompanyProfile>(this.apiUrl, payload).pipe(
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error, "Mise a jour du profil entreprise impossible.")))
      )
    );
  }

  private extractErrorMessage(error: HttpErrorResponse, fallback: string): string {
    if (typeof error.error === 'string' && error.error.trim()) {
      return error.error;
    }

    if (error.error?.message) {
      return error.error.message;
    }

    if (error.status === 0) {
      return 'Backend indisponible. Verifiez que Spring Boot tourne sur le port 8081.';
    }

    return fallback;
  }
}
