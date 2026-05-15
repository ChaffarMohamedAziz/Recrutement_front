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

export interface AssistantCompanyDescriptionPayload {
  nomEntreprise: string;
  secteur: string;
  adresse: string;
  email: string;
  abonnementActif: string;
  siteWeb: string;
  currentDescription: string;
}

export interface AssistantCompanyDescriptionResponse {
  message: string;
  generatedDescription: string;
  highlights: string[];
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
  candidateId?: number | null;
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
  message: string;
  prompt?: string;
  contextType?: 'GENERAL' | 'CANDIDATE_PROFILE' | 'JOB_OFFER' | 'APPLICATION' | 'INTERVIEW' | 'AI_TEST';
  targetId?: number | null;
  history?: string[];
}

export interface AssistantChatResponse {
  message: string;
  content: string;
  response?: string;
  suggestions: string[];
  source?: string;
  createdAt?: string;
}

export interface CandidateTopMatchingOfferResponse {
  offerId: number;
  title: string;
  companyName: string;
  location: string;
  contractType: string;
  matchingScore: number;
  matchingSkills: string[];
  missingSkills: string[];
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

  generateCompanyDescription(payload: AssistantCompanyDescriptionPayload): Observable<AssistantCompanyDescriptionResponse> {
    return this.http.post<AssistantCompanyDescriptionResponse>(`${this.apiUrl}/recruiter/company-description`, payload).pipe(
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error, "Generation de la description entreprise impossible.")))
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

  getCandidateTopMatchingOffers(minScore = 70): Observable<CandidateTopMatchingOfferResponse[]> {
    return this.http.get<CandidateTopMatchingOfferResponse[]>(
      `http://localhost:8081/api/candidate/assistant/top-matching-offers?minScore=${minScore}`
    ).pipe(
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error, 'Chargement des offres les plus compatibles impossible.')))
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

  chat(payload: AssistantChatPayload): Observable<AssistantChatResponse> {
    return this.http.post<AssistantChatResponse>(`${this.apiUrl}/chat`, payload).pipe(
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error, "L'assistant IA est indisponible.")))
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
