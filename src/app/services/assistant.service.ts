import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface AssistantOfferDraftPayload {
  title: string;
  category: string;
  location: string;
  contractType: string;
  experienceLevel: string;
  tone: string;
  context: string;
  skills: string[];
}

export interface AssistantOfferDraftResponse {
  message: string;
  generatedDescription: string;
  highlights: string[];
  keywords: string[];
}

export interface AssistantInterviewQuestionsPayload {
  offerTitle: string;
  jobDescription: string;
  seniority: string;
  count: number;
  focusSkills: string[];
}

export interface AssistantInterviewQuestionsResponse {
  message: string;
  intro: string;
  questions: string[];
}

export interface AssistantCandidateSearchPayload {
  query: string;
  offerId: number | null;
  limit: number;
}

export interface AssistantCandidateSuggestion {
  candidateId: number;
  name: string;
  email: string;
  jobTitle: string;
  location: string;
  experience: number;
  score: number;
  rationale: string;
  profileSummary: string;
  matchingSkills: string[];
}

export interface AssistantCandidateSearchResponse {
  message: string;
  suggestions: AssistantCandidateSuggestion[];
}

export interface AssistantChatPayload {
  prompt: string;
}

export interface AssistantChatResponse {
  message: string;
  content: string;
  suggestions: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AssistantService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8081/api/assistant';

  generateOfferDraft(payload: AssistantOfferDraftPayload): Observable<AssistantOfferDraftResponse> {
    return this.http.post<AssistantOfferDraftResponse>(`${this.apiUrl}/recruiter/generate-offer`, payload).pipe(
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error, "Generation de la description impossible.")))
      )
    );
  }

  suggestInterviewQuestions(payload: AssistantInterviewQuestionsPayload): Observable<AssistantInterviewQuestionsResponse> {
    return this.http.post<AssistantInterviewQuestionsResponse>(`${this.apiUrl}/recruiter/interview-questions`, payload).pipe(
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error, "Generation des questions impossible.")))
      )
    );
  }

  findCandidates(payload: AssistantCandidateSearchPayload): Observable<AssistantCandidateSearchResponse> {
    return this.http.post<AssistantCandidateSearchResponse>(`${this.apiUrl}/recruiter/find-candidates`, payload).pipe(
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error, 'Recherche IA de candidats impossible.')))
      )
    );
  }

  coachCandidate(payload: AssistantChatPayload): Observable<AssistantChatResponse> {
    return this.http.post<AssistantChatResponse>(`${this.apiUrl}/candidate/coach`, payload).pipe(
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error, "L'assistant candidat est indisponible.")))
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
