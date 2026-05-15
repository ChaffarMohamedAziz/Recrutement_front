import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export type AtsStatus =
  | 'APPLIED'
  | 'AI_TEST_SENT'
  | 'AI_TEST_IN_PROGRESS'
  | 'AI_TEST_COMPLETED'
  | 'INTERVIEW'
  | 'ENTRETIEN_PLANIFIE'
  | 'ENTRETIEN_EN_COURS'
  | 'ABSENCE_A_VERIFIER'
  | 'REJECTION_SUGGESTED'
  | 'REJECTED'
  | 'RETENU';

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
  candidateCvFileName: string;
  candidateCvFileUrl: string;
  candidateProfilePhotoUrl: string;
  candidateCoverPhotoUrl: string;
  candidateLinkedinUrl: string;
  candidateGithubUrl: string;
  candidateFacebookUrl: string;
  candidateInstagramUrl: string;
  aiTestId: number | null;
  hasAiTest?: boolean | null;
  aiTestAvailable?: boolean | null;
  canPassAiTest?: boolean | null;
  aiTestStatus: string | null;
  aiTestThreshold: number | null;
  aiTestScore: number | null;
  aiTestRecommendation: string | null;
  aiTestDurationMinutes: number | null;
  aiTestStartedAt: string;
  aiTestExpiresAt: string;
  aiTestSubmittedAt: string;
  aiTestCompletedAt: string;
  aiTestClosedReason: string;
  aiTestCheatingSuspicion: boolean | null;
  aiTestTabSwitchCount: number | null;
  aiTestWarningCount: number | null;
  interviewId: number | null;
  interviewStatus: string;
  interviewDateTime: string;
  interviewDurationMinutes: number | null;
  interviewType: string;
  interviewMode: string;
  interviewMeetingLink: string;
  interviewLocation: string;
  interviewReminder24hSent: boolean | null;
  interviewReminder1hSent: boolean | null;
  interviewAttendanceStatus: string;
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
      map((response) => this.normalizeApplication(response)),
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, 'Postulation impossible.'))))
    );
  }

  getMyApplications(): Observable<ApplicationResponse[]> {
    return this.http.get<ApplicationResponse[]>(`${this.candidateApiUrl}/candidatures`).pipe(
      map((response) => response.map((item) => this.normalizeApplication(item))),
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
      map((response) => response.map((item) => this.normalizeApplication(item))),
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, 'Chargement des candidats impossible.'))))
    );
  }

  getRecruiterApplicationById(applicationId: number): Observable<ApplicationResponse> {
    return this.http.get<ApplicationResponse>(`${this.recruiterApiUrl}/${applicationId}`).pipe(
      map((response) => this.normalizeApplication(response)),
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, 'Chargement du profil candidat impossible.'))))
    );
  }

  downloadRecruiterCandidateCvByCandidateId(candidateId: number): Observable<Blob> {
    return this.http.get(`http://localhost:8081/api/recruiter/candidates/${candidateId}/cv`, { responseType: 'blob' }).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, 'Telechargement du CV impossible.'))))
    );
  }

  downloadRecruiterCandidateCv(applicationId: number): Observable<Blob> {
    return this.http.get(`${this.recruiterApiUrl}/${applicationId}/cv`, { responseType: 'blob' }).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, 'Telechargement du CV impossible.'))))
    );
  }

  updateRecruiterApplicationStatus(applicationId: number, status: string): Observable<ApplicationResponse> {
    return this.http.put<ApplicationResponse>(`${this.recruiterApiUrl}/${applicationId}/status`, { status }).pipe(
      map((response) => this.normalizeApplication(response)),
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, 'Mise a jour du pipeline impossible.'))))
    );
  }

  private normalizeApplication(application: ApplicationResponse): ApplicationResponse {
    return {
      ...application,
      status: this.normalizeStatus(application.status)
    };
  }

  private normalizeStatus(status: string | null | undefined): AtsStatus {
    const normalized = (status || '').trim().toUpperCase();

    switch (normalized) {
      case 'A_TRIER':
      case 'APPLIED':
        return 'APPLIED';
      case 'ENTRETIEN':
        return 'INTERVIEW';
      case 'ENTRETIEN_PLANIFIE':
      case 'INTERVIEW_SCHEDULED':
        return 'ENTRETIEN_PLANIFIE';
      case 'ENTRETIEN_EN_COURS':
      case 'INTERVIEW_IN_PROGRESS':
        return 'ENTRETIEN_EN_COURS';
      case 'ABSENCE_A_VERIFIER':
      case 'ABSENCE_TO_VERIFY':
        return 'ABSENCE_A_VERIFIER';
      case 'SUSPICION_TRICHE':
      case 'REFUSE':
      case 'REJECTED':
        return 'REJECTED';
      case 'AI_TEST_SENT':
      case 'TEST_IA_ENVOYE':
        return 'AI_TEST_SENT';
      case 'AI_TEST_IN_PROGRESS':
      case 'TEST_IA_EN_COURS':
        return 'AI_TEST_IN_PROGRESS';
      case 'AI_TEST_COMPLETED':
      case 'TEST_IA_TERMINE':
        return 'AI_TEST_COMPLETED';
      case 'REJECTION_SUGGESTED':
      case 'REFUS_PROPOSE':
        return 'REJECTION_SUGGESTED';
      case 'RETAINED':
      case 'RETENU':
        return 'RETENU';
      case 'INTERVIEW':
      default:
        return 'APPLIED';
    }
  }

  private extractErrorMessage(error: HttpErrorResponse, fallback: string): string {
    if (error.error instanceof Blob) {
      return fallback;
    }

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
