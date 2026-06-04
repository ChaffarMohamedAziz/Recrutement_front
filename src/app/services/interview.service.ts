import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MessageResponse } from './ai-test.service';

export interface InterviewPlannerDraftResponse {
  applicationId: number;
  candidateName: string;
  offerTitle: string;
  aiTestScore: number | null;
  aiRecommendation: string;
  defaultInvitationMessage: string;
  suggestedInterviewType: string;
  suggestedQuestions: string[];
}

export interface InterviewResponse {
  id: number;
  applicationId: number;
  offerId: number;
  candidateId: number;
  recruiterId: number;
  candidateName: string;
  offerTitle: string;
  companyName: string;
  interviewDateTime: string;
  durationMinutes: number;
  interviewType: string;
  mode: string;
  meetingLink: string;
  location: string;
  invitationMessage: string;
  aiSuggestedQuestions: string[];
  status: string;
  reminder24hSent: boolean;
  reminder1hSent: boolean;
  attendanceStatus: string;
  absenceCheckedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleInterviewPayload {
  interviewType: string;
  mode: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  meetingLink: string;
  location: string;
  invitationMessage: string;
}

export interface ConfirmInterviewAbsencePayload {
  emailBody?: string;
}

@Injectable({
  providedIn: 'root'
})
export class InterviewService {
  private readonly http = inject(HttpClient);
  private readonly recruiterApplicationsApiUrl = 'http://localhost:8081/api/recruiter/candidatures';
  private readonly recruiterInterviewsApiUrl = 'http://localhost:8081/api/recruiter/interviews';
  private readonly candidateInterviewsApiUrl = 'http://localhost:8081/api/candidate/interviews';

  getPlannerDraft(applicationId: number): Observable<InterviewPlannerDraftResponse> {
    return this.http.get<InterviewPlannerDraftResponse>(`${this.recruiterApplicationsApiUrl}/${applicationId}/interview-draft`).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, "Chargement du planner d'entretien impossible."))))
    );
  }

  scheduleInterview(applicationId: number, payload: ScheduleInterviewPayload): Observable<InterviewResponse> {
    return this.http.post<InterviewResponse>(`${this.recruiterApplicationsApiUrl}/${applicationId}/interview`, payload).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, "Planification de l'entretien impossible."))))
    );
  }

  markPresent(interviewId: number): Observable<InterviewResponse> {
    return this.http.put<InterviewResponse>(`${this.recruiterInterviewsApiUrl}/${interviewId}/present`, {}).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, 'Mise a jour de la presence impossible.'))))
    );
  }

  confirmAbsence(interviewId: number, payload?: ConfirmInterviewAbsencePayload): Observable<MessageResponse> {
    return this.http.put<MessageResponse>(`${this.recruiterInterviewsApiUrl}/${interviewId}/confirm-absence`, payload || {}).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, "Confirmation de l'absence impossible."))))
    );
  }

  rescheduleInterview(interviewId: number, payload: ScheduleInterviewPayload): Observable<InterviewResponse> {
    return this.http.put<InterviewResponse>(`${this.recruiterInterviewsApiUrl}/${interviewId}/reschedule`, payload).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, "Replanification de l'entretien impossible."))))
    );
  }

  getCandidateInterviews(): Observable<InterviewResponse[]> {
    return this.http.get<InterviewResponse[]>(this.candidateInterviewsApiUrl).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, 'Chargement des entretiens impossible.'))))
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
