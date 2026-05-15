import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from './auth.service';

export type AiTestStatus =
  | 'DRAFT'
  | 'GENERATED'
  | 'VALIDATED'
  | 'PUBLISHED'
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'EXPIRED'
  | 'CHEATING_SUSPECTED'
  | 'CLOSED'
  | 'AI_TEST_SENT'
  | 'AI_TEST_COMPLETED'
  | 'INTERVIEW'
  | 'REJECTION_SUGGESTED'
  | 'REJECTED';

export type AiQuestionType = 'MCQ' | 'QCM' | 'SHORT_TEXT' | 'SCENARIO';

export interface AiQuestionResponse {
  id: number;
  questionText: string;
  questionType: AiQuestionType;
  options: string[];
  points: number;
  orderIndex?: number | null;
  timeLimitSeconds?: number | null;
  acceptedByRecruiter?: boolean | null;
  candidateAnswer: string;
  correct?: boolean | null;
  pointsObtained?: number | null;
  correctAnswer?: string | null;
  expectedAnswer?: string | null;
}

export interface AiTestResponse {
  id: number;
  applicationId: number | null;
  offerId: number | null;
  candidateId: number | null;
  recruiterId: number | null;
  resultId?: number | null;
  offerTitle: string;
  companyName: string;
  candidateName: string;
  title?: string;
  description?: string;
  status: AiTestStatus;
  threshold: number;
  passingScore?: number | null;
  durationMinutes: number;
  totalDurationSeconds?: number | null;
  numberOfQuestions?: number | null;
  score: number | null;
  recommendation: string;
  difficulty?: string;
  allowPreviousQuestion?: boolean | null;
  currentQuestionIndex?: number | null;
  totalQuestions?: number | null;
  questionStartedAt?: string;
  questionExpiresAt?: string;
  createdAt: string;
  updatedAt?: string;
  startedAt: string;
  expiresAt: string;
  submittedAt: string;
  completedAt: string;
  timeRemainingSeconds: number | null;
  closedReason: string;
  cheatingSuspicion: boolean | null;
  tabSwitchCount: number | null;
  warningCount: number | null;
  report: string;
  strengths: string[];
  weaknesses: string[];
  generatedReport: string;
  proposedRejectionEmail: string;
  evaluationSkills?: string[];
  questions: AiQuestionResponse[];
}

export interface CreateAiTestPayload {
  enabled?: boolean | null;
  title?: string | null;
  description?: string | null;
  numberOfQuestions?: number | null;
  threshold?: number | null;
  durationMinutes?: number | null;
  difficulty?: string | null;
  allowPreviousQuestion?: boolean | null;
  evaluationSkills?: string[];
}

export interface AiAnswerSubmissionPayload {
  questionId: number;
  candidateAnswer: string;
  timeSpentSeconds?: number | null;
}

export interface SubmitAiTestPayload {
  answers: AiAnswerSubmissionPayload[];
  autoSubmit?: boolean;
  submitReason?: string;
}

export interface AiTestSecurityEventPayload {
  eventType: 'TAB_SWITCH' | 'PAGE_LEAVE' | 'WINDOW_BLUR' | 'RELOAD_ATTEMPT' | 'ROUTE_LEAVE';
  description: string;
}

export interface RejectAfterAiTestPayload {
  emailBody: string;
}

export interface AiQuestionUpdatePayload {
  questionText?: string;
  questionType?: AiQuestionType;
  options?: string[];
  correctAnswer?: string;
  expectedAnswer?: string;
  points?: number;
  orderIndex?: number;
  timeLimitSeconds?: number;
  acceptedByRecruiter?: boolean;
}

export interface AiCurrentQuestionAnswerPayload {
  questionId: number;
  candidateAnswer: string;
  timeSpentSeconds?: number | null;
}

export interface MessageResponse {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class AiTestService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly recruiterApiUrl = 'http://localhost:8081/api/recruiter';
  private readonly recruiterApplicationsApiUrl = 'http://localhost:8081/api/recruiter/candidatures';
  private readonly candidateRootApiUrl = 'http://localhost:8081/api/candidate';
  private readonly candidateAiTestsApiUrl = `${this.candidateRootApiUrl}/ai-tests`;
  private readonly localTestState = new Map<number, AiTestResponse>();

  createRecruiterAiTest(applicationId: number, payload: CreateAiTestPayload): Observable<AiTestResponse> {
    return this.http.post<AiTestResponse>(`${this.recruiterApiUrl}/applications/${applicationId}/ai-test`, payload).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          return this.http.post<AiTestResponse>(`${this.recruiterApplicationsApiUrl}/${applicationId}/ai-test`, payload);
        }

        return throwError(() => error);
      }),
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, 'Envoi du test IA impossible.'))))
    );
  }

  configureOfferAiTest(offerId: number, payload: CreateAiTestPayload): Observable<AiTestResponse> {
    return this.http.post<AiTestResponse>(`${this.recruiterApiUrl}/offers/${offerId}/ai-test`, payload).pipe(
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error, 'Configuration du Test IA impossible.')))
      )
    );
  }

  generateOfferAiTest(offerId: number, payload: CreateAiTestPayload): Observable<AiTestResponse> {
    return this.http.post<AiTestResponse>(`${this.recruiterApiUrl}/offers/${offerId}/ai-test/generate`, payload).pipe(
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error, 'Generation du Test IA impossible.')))
      )
    );
  }

  getRecruiterOfferAiTest(offerId: number): Observable<AiTestResponse> {
    return this.http.get<AiTestResponse>(`${this.recruiterApiUrl}/offers/${offerId}/ai-test`).pipe(
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error, 'Chargement du Test IA impossible.')))
      )
    );
  }

  updateRecruiterAiTest(testId: number, payload: CreateAiTestPayload): Observable<AiTestResponse> {
    return this.http.put<AiTestResponse>(`${this.recruiterApiUrl}/ai-tests/${testId}`, payload).pipe(
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error, 'Mise a jour du Test IA impossible.')))
      )
    );
  }

  updateRecruiterAiQuestion(questionId: number, payload: AiQuestionUpdatePayload): Observable<AiTestResponse> {
    return this.http.put<AiTestResponse>(`${this.recruiterApiUrl}/ai-tests/questions/${questionId}`, payload).pipe(
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error, 'Modification de la question impossible.')))
      )
    );
  }

  regenerateRecruiterAiQuestion(questionId: number): Observable<AiTestResponse> {
    return this.http.post<AiTestResponse>(`${this.recruiterApiUrl}/ai-tests/questions/${questionId}/regenerate`, {}).pipe(
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error, 'Regeneration de la question impossible.')))
      )
    );
  }

  deleteRecruiterAiQuestion(questionId: number): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.recruiterApiUrl}/ai-tests/questions/${questionId}`).pipe(
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error, 'Suppression de la question impossible.')))
      )
    );
  }

  validateRecruiterAiTest(testId: number): Observable<AiTestResponse> {
    return this.http.post<AiTestResponse>(`${this.recruiterApiUrl}/ai-tests/${testId}/validate`, {}).pipe(
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error, 'Validation du Test IA impossible.')))
      )
    );
  }

  getCandidateAiTests(): Observable<AiTestResponse[]> {
    return this.http.get<AiTestResponse[]>(this.candidateAiTestsApiUrl).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          return of([]);
        }

        return throwError(() => new Error(this.extractErrorMessage(error, 'Chargement des tests IA impossible.')));
      })
    );
  }

  getCandidateAiTestByApplication(applicationId: number): Observable<AiTestResponse> {
    return this.http.get<AiTestResponse>(`${this.candidateRootApiUrl}/applications/${applicationId}/ai-test`).pipe(
      map((test) => this.rememberLocalState(test)),
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error, 'Chargement du Test IA pour cette candidature impossible.')))
      )
    );
  }

  getCandidateAiTest(testId: number): Observable<AiTestResponse> {
    return this.http.get<AiTestResponse>(`${this.candidateAiTestsApiUrl}/${testId}`).pipe(
      map((test) => this.mergeWithLocalState(test)),
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, 'Chargement des tests IA impossible.'))))
    );
  }

  startCandidateAiTest(testId: number): Observable<AiTestResponse> {
    return this.http.post<AiTestResponse>(`${this.candidateAiTestsApiUrl}/${testId}/start`, {}).pipe(
      map((test) => this.rememberLocalState(test)),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          return this.getCandidateAiTest(testId).pipe(
            map((test) => this.rememberLocalState(this.startTestLocally(test)))
          );
        }

        return throwError(() => error);
      }),
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, 'Demarrage du test IA impossible.'))))
    );
  }

  getCurrentQuestion(resultId: number): Observable<AiTestResponse> {
    return this.http.get<AiTestResponse>(`${this.candidateRootApiUrl}/ai-test-results/${resultId}/current-question`).pipe(
      map((test) => this.rememberLocalState(test)),
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error, 'Chargement de la question courante impossible.')))
      )
    );
  }

  answerCurrentQuestion(resultId: number, payload: AiCurrentQuestionAnswerPayload): Observable<AiTestResponse> {
    return this.http.post<AiTestResponse>(`${this.candidateRootApiUrl}/ai-test-results/${resultId}/answer`, payload).pipe(
      map((test) => this.rememberLocalState(test)),
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error, 'Enregistrement de la reponse impossible.')))
      )
    );
  }

  moveToNextQuestion(resultId: number): Observable<AiTestResponse> {
    return this.http.post<AiTestResponse>(`${this.candidateRootApiUrl}/ai-test-results/${resultId}/next`, {}).pipe(
      map((test) => this.rememberLocalState(test)),
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error, 'Passage a la question suivante impossible.')))
      )
    );
  }

  submitCandidateAiTestResult(resultId: number): Observable<AiTestResponse> {
    return this.http.post<AiTestResponse>(`${this.candidateRootApiUrl}/ai-test-results/${resultId}/submit`, {}).pipe(
      map((test) => this.rememberLocalState(test)),
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error, 'Soumission finale du test impossible.')))
      )
    );
  }

  submitCandidateAiTest(testId: number, payload: SubmitAiTestPayload): Observable<AiTestResponse> {
    return this.http.post<AiTestResponse>(`${this.candidateAiTestsApiUrl}/${testId}/submit`, payload).pipe(
      map((test) => this.rememberLocalState(test)),
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, 'Soumission du test IA impossible.'))))
    );
  }

  registerCandidateAiTestSecurityEvent(testId: number, payload: AiTestSecurityEventPayload): Observable<AiTestResponse> {
    return this.http.post<AiTestResponse>(`${this.candidateAiTestsApiUrl}/${testId}/security-event`, payload).pipe(
      map((test) => this.rememberLocalState(test)),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          return this.getCandidateAiTest(testId).pipe(
            map((test) => this.rememberLocalState(this.applyLocalSecurityEvent(this.localTestState.get(testId) || test, payload)))
          );
        }

        return throwError(() => error);
      }),
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, 'Enregistrement de l evenement de securite impossible.'))))
    );
  }

  sendCandidateAiTestSecurityEventKeepalive(testId: number, payload: AiTestSecurityEventPayload): void {
    const token = this.authService.getToken();
    if (!token) {
      return;
    }

    void fetch(`${this.candidateAiTestsApiUrl}/${testId}/security-event`, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    }).catch(() => undefined);
  }

  getRecruiterAiTestResult(testId: number): Observable<AiTestResponse> {
    return this.http.get<AiTestResponse>(`${this.recruiterApiUrl}/ai-tests/${testId}/result`).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, 'Chargement du rapport IA impossible.'))))
    );
  }

  rejectAfterAiTest(applicationId: number, payload: RejectAfterAiTestPayload): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.recruiterApiUrl}/applications/${applicationId}/reject-after-ai-test`, payload).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          return this.http.post<MessageResponse>(`${this.recruiterApplicationsApiUrl}/${applicationId}/reject-after-ai-test`, payload);
        }

        return throwError(() => error);
      }),
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, "Validation du refus impossible."))))
    );
  }

  reopenRecruiterAiTest(testId: number): Observable<AiTestResponse> {
    return this.http.post<AiTestResponse>(`${this.recruiterApiUrl}/ai-tests/${testId}/reopen`, {}).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, 'Reouverture du test IA impossible.'))))
    );
  }

  private extractErrorMessage(error: HttpErrorResponse, fallback: string): string {
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

  private startTestLocally(test: AiTestResponse): AiTestResponse {
    const startedAt = test.startedAt || new Date().toISOString();
    const totalDurationSeconds = test.totalDurationSeconds
      ?? (test.questions || []).reduce((sum, question) => sum + Math.max(0, Number(question.timeLimitSeconds ?? 0)), 0)
      ?? 0;
    const fallbackDurationSeconds = totalDurationSeconds > 0
      ? totalDurationSeconds
      : Math.max(0, (test.durationMinutes || 0) * 60);
    const expiresAt = test.expiresAt || new Date(Date.now() + fallbackDurationSeconds * 1000).toISOString();
    const expiresTimestamp = new Date(expiresAt).getTime();
    const timeRemainingSeconds = Number.isNaN(expiresTimestamp)
      ? fallbackDurationSeconds
      : Math.max(0, Math.floor((expiresTimestamp - Date.now()) / 1000));

    return {
      ...test,
      status: 'IN_PROGRESS',
      startedAt,
      expiresAt,
      timeRemainingSeconds,
      cheatingSuspicion: false,
      warningCount: test.warningCount ?? 0,
      tabSwitchCount: test.tabSwitchCount ?? 0,
      closedReason: ''
    };
  }

  private applyLocalSecurityEvent(
    test: AiTestResponse,
    payload: AiTestSecurityEventPayload
  ): AiTestResponse {
    const warningCount = (test.warningCount ?? 0) + 1;
    const tabSwitchCount = payload.eventType === 'TAB_SWITCH'
      ? (test.tabSwitchCount ?? 0) + 1
      : (test.tabSwitchCount ?? 0);

    if (warningCount >= 2) {
      return {
        ...test,
        status: 'CHEATING_SUSPECTED',
        cheatingSuspicion: true,
        warningCount,
        tabSwitchCount,
        closedReason: payload.description || "Le candidat a quitte la page du test ou change d'onglet."
      };
    }

    return {
      ...test,
      warningCount,
      tabSwitchCount
    };
  }

  private rememberLocalState(test: AiTestResponse): AiTestResponse {
    this.localTestState.set(test.id, test);
    return test;
  }

  private mergeWithLocalState(test: AiTestResponse): AiTestResponse {
    const local = this.localTestState.get(test.id);
    if (!local) {
      return this.rememberLocalState(test);
    }

    const merged: AiTestResponse = {
      ...test,
      status: local.status || test.status,
      startedAt: local.startedAt || test.startedAt,
      expiresAt: local.expiresAt || test.expiresAt,
      submittedAt: local.submittedAt || test.submittedAt,
      completedAt: local.completedAt || test.completedAt,
      timeRemainingSeconds: local.timeRemainingSeconds ?? test.timeRemainingSeconds,
      closedReason: local.closedReason || test.closedReason,
      cheatingSuspicion: local.cheatingSuspicion ?? test.cheatingSuspicion,
      tabSwitchCount: local.tabSwitchCount ?? test.tabSwitchCount,
      warningCount: local.warningCount ?? test.warningCount,
      resultId: local.resultId ?? test.resultId,
      currentQuestionIndex: local.currentQuestionIndex ?? test.currentQuestionIndex,
      totalQuestions: local.totalQuestions ?? test.totalQuestions,
      questionStartedAt: local.questionStartedAt || test.questionStartedAt,
      questionExpiresAt: local.questionExpiresAt || test.questionExpiresAt
    };

    return this.rememberLocalState(merged);
  }
}
