import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export type AtsStatus = 'A_TRIER' | 'ENTRETIEN' | 'RETENU' | 'REFUSE';

export interface SkillMatchResponse {
  nom: string;
  matched: boolean;
  type: string;
  ponderation: number;
}

export interface ApplicationResponse {
  id: number;
  offerId: number;
  offerTitle: string;
  companyName: string;
  offerLocation: string;
  contractType: string;
  appliedAt: string;
  status: AtsStatus;
  score: number;
  candidateId: number;
  candidateName: string;
  candidateEmail: string;
  candidateJobTitle: string;
  candidateLocation: string;
  candidateExperience: number;
  candidateSummary: string;
  matchingSkills: string[];
  missingSkills: string[];
  skills: SkillMatchResponse[];
}

@Injectable({
  providedIn: 'root'
})
export class ApplicationService {
  private readonly http = inject(HttpClient);
  private readonly candidateApiUrl = 'http://localhost:8081/api/candidate';
  private readonly recruiterApiUrl = 'http://localhost:8081/api/recruiter/candidatures';

  applyToOffer(offerId: number): Observable<ApplicationResponse> {
    return this.http.post<ApplicationResponse>(`${this.candidateApiUrl}/offres/${offerId}/apply`, {}).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, 'Postulation impossible.'))))
    );
  }

  getMyApplications(): Observable<ApplicationResponse[]> {
    return this.http.get<ApplicationResponse[]>(`${this.candidateApiUrl}/candidatures`).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, 'Chargement des candidatures impossible.'))))
    );
  }

  getRecruiterApplications(filters?: { offerId?: number | null; minScore?: number | null }): Observable<ApplicationResponse[]> {
    const params = new URLSearchParams();

    if (filters?.offerId) {
      params.set('offerId', String(filters.offerId));
    }

    if (filters?.minScore !== undefined && filters?.minScore !== null) {
      params.set('minScore', String(filters.minScore));
    }

    const query = params.toString();
    const url = query ? `${this.recruiterApiUrl}?${query}` : this.recruiterApiUrl;

    return this.http.get<ApplicationResponse[]>(url).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, 'Chargement des candidats impossible.'))))
    );
  }

  getRecruiterApplicationById(applicationId: number): Observable<ApplicationResponse> {
    return this.http.get<ApplicationResponse>(`${this.recruiterApiUrl}/${applicationId}`).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, 'Chargement du profil candidat impossible.'))))
    );
  }

  updateRecruiterApplicationStatus(applicationId: number, status: AtsStatus): Observable<ApplicationResponse> {
    return this.http.put<ApplicationResponse>(`${this.recruiterApiUrl}/${applicationId}/status`, { status }).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, 'Mise a jour du pipeline impossible.'))))
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
