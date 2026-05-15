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
  candidaturesCount?: number;
  compatibilityScore?: number | null;
  alreadyApplied?: boolean;
  applicationId?: number | null;
  applicationStatus?: string | null;
  hasAiTest?: boolean;
  aiTestAvailable?: boolean;
  aiTestId?: number | null;
  aiTestStatus?: string | null;
  aiTestResultStatus?: string | null;
  canPassAiTest?: boolean;
}

export interface ApiMessageResponse {
  success: boolean;
  message: string;
}

export interface MatchingCandidateResponse {
  candidateId: number;
  fullName: string;
  email: string;
  profileTitle: string;
  location: string;
  experience: number;
  matchingScore: number;
  compatibleSkills: string[];
  missingSkills: string[];
  hasApplied: boolean;
  alreadyInvited: boolean;
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

  getMatchingCandidates(offerId: number, minScore: number): Observable<MatchingCandidateResponse[]> {
    return this.http.get<MatchingCandidateResponse[]>(`${this.recruiterApiUrl}/${offerId}/matching-candidates?minScore=${minScore}`).pipe(
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error, 'Chargement des candidats compatibles impossible.')))
      )
    );
  }

  inviteCandidateToOffer(offerId: number, candidateId: number): Observable<ApiMessageResponse> {
    return this.http.post<ApiMessageResponse>(`${this.recruiterApiUrl}/${offerId}/invite-candidate/${candidateId}`, {}).pipe(
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error, "Envoi de l'invitation impossible.")))
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

  deleteOffer(id: number): Observable<ApiMessageResponse> {
    return this.http.delete<ApiMessageResponse>(`${this.recruiterApiUrl}/${id}`).pipe(
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error, "Suppression de l'offre impossible.")))
      )
    );
  }

  archiveOffer(offer: OfferResponse): Observable<OfferResponse> {
    const archivePayload = this.toOfferPayload(offer, 'ARCHIVEE');

    return this.http.patch<OfferResponse>(`${this.recruiterApiUrl}/${offer.id}/archive`, {}).pipe(
      catchError((error: HttpErrorResponse) => {
        if ([0, 404, 405].includes(error.status)) {
          return this.http.put<OfferResponse>(`${this.recruiterApiUrl}/${offer.id}`, archivePayload).pipe(
            catchError((fallbackError: HttpErrorResponse) =>
              throwError(() => new Error(this.extractErrorMessage(fallbackError, "Archivage de l'offre impossible.")))
            )
          );
        }

        return throwError(() => new Error(this.extractErrorMessage(error, "Archivage de l'offre impossible.")));
      })
    );
  }

  unarchiveOffer(offer: OfferResponse): Observable<OfferResponse> {
    const unarchivePayload = this.toOfferPayload(offer, 'PUBLIEE');

    return this.http.patch<OfferResponse>(`${this.recruiterApiUrl}/${offer.id}/unarchive`, {}).pipe(
      catchError((error: HttpErrorResponse) => {
        if ([0, 404, 405].includes(error.status)) {
          return this.http.put<OfferResponse>(`${this.recruiterApiUrl}/${offer.id}`, unarchivePayload).pipe(
            catchError((fallbackError: HttpErrorResponse) =>
              throwError(() => new Error(this.extractErrorMessage(fallbackError, "Desarchivage de l'offre impossible.")))
            )
          );
        }

        return throwError(() => new Error(this.extractErrorMessage(error, "Desarchivage de l'offre impossible.")));
      })
    );
  }

  private toOfferPayload(offer: OfferResponse, statutOverride?: string): OfferPayload {
    return {
      titre: offer.titre || '',
      categorie: offer.categorie || '',
      description: offer.description || '',
      localisation: offer.localisation || '',
      salaire: Number(offer.salaire || 0),
      devise: offer.devise || 'TND',
      nombrePostes: Number(offer.nombrePostes || 1),
      experienceRequise: offer.experienceRequise || '',
      typeContrat: offer.typeContrat || '',
      statut: statutOverride || offer.statut || 'PUBLIEE',
      dateExpiration: offer.dateExpiration || '',
      competences: (offer.competences || []).map((item) => ({
        competenceId: item.competenceId ?? null,
        nom: item.nom || '',
        type: item.type || 'OBLIGATOIRE',
        ponderation: item.ponderation ?? 60,
        niveau: item.niveau || 'Intermediaire'
      }))
    };
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
