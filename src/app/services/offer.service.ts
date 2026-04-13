import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export type OfferSkillType = 'OBLIGATOIRE' | 'SOUHAITEE';

export interface OfferSkillRequirement {
  competenceId: number | null;
  nom: string;
  type: OfferSkillType;
  ponderation: number;
  niveau: string;
}

export interface OfferPayload {
  titre: string;
  categorie: string;
  description: string;
  localisation: string;
  salaire: number;
  devise: string;
  nombrePostes: number;
  experienceRequise: string;
  typeContrat: string;
  statut: string;
  dateExpiration: string;
  competences: OfferSkillRequirement[];
}

export interface OfferResponse extends OfferPayload {
  id: number;
  datePublication: string;
  nomEntreprise: string;
  recruiterId: number;
  compatibilityScore?: number | null;
  alreadyApplied?: boolean;
  applicationStatus?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class OfferService {
  private readonly http = inject(HttpClient);
  private readonly publicApiUrl = 'http://localhost:8081/api/offres';
  private readonly recruiterApiUrl = 'http://localhost:8081/api/recruiter/offres';

  getOffers(): Observable<OfferResponse[]> {
    return this.http.get<OfferResponse[]>(this.publicApiUrl).pipe(
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error, 'Chargement des offres impossible.')))
      )
    );
  }

  getOfferById(id: number): Observable<OfferResponse> {
    return this.http.get<OfferResponse>(`${this.publicApiUrl}/${id}`).pipe(
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error, "Chargement de l'offre impossible.")))
      )
    );
  }

  getRecruiterOffers(): Observable<OfferResponse[]> {
    return this.http.get<OfferResponse[]>(this.recruiterApiUrl).pipe(
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error, 'Chargement des offres recruteur impossible.')))
      )
    );
  }

  createOffer(payload: OfferPayload): Observable<OfferResponse> {
    return this.http.post<OfferResponse>(this.recruiterApiUrl, payload).pipe(
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error, "Publication de l'offre impossible.")))
      )
    );
  }

  updateOffer(id: number, payload: OfferPayload): Observable<OfferResponse> {
    return this.http.put<OfferResponse>(`${this.recruiterApiUrl}/${id}`, payload).pipe(
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error, "Mise a jour de l'offre impossible.")))
      )
    );
  }

  private extractErrorMessage(error: HttpErrorResponse, fallback: string): string {
    if (error.status === 403) {
      return "Action non autorisee. Reconnectez-vous avec un compte recruteur pour publier une offre.";
    }

    if (typeof error.error === 'string' && error.error.trim()) {
      return error.error;
    }

    if (error.error?.message) {
      return error.error.message;
    }

    if (error.error?.error) {
      return error.error.error;
    }

    if (error.status === 0) {
      return 'Backend indisponible. Verifiez que Spring Boot tourne sur le port 8081.';
    }

    return fallback;
  }
}
