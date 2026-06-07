import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface TopSkillItem {
  name: string;
  count: number;
}

export interface TopOfferActivityItem {
  offerId: number;
  title: string;
  applicationsCount: number;
}

export interface AdminOverviewStatsResponse {
  totalUsers: number;
  totalCandidates: number;
  totalRecruiters: number;
  totalOffers: number;
  totalApplications: number;
  totalPlannedInterviews: number;
  totalRejectedApplications: number;
  totalRetainedCandidates: number;
  totalCompletedAiTests: number;
  aiTestSuccessRate: number;
  averageMatchingScore: number;
  topSkills: TopSkillItem[];
  topOffers: TopOfferActivityItem[];
}

export interface ChartDataResponse {
  title: string;
  labels: string[];
  values: number[];
}

export interface AiTestStatsResponse {
  totalTests: number;
  completedTests: number;
  passedTests: number;
  failedTests: number;
  expiredTests: number;
  cheatingSuspicions: number;
  averageScore: number;
  successRate: number;
}

export interface AiInsightItem {
  title: string;
  description: string;
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | string;
}

export interface ServiceHealthItem {
  service: string;
  status: string;
  detail: string;
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | string;
}

export interface AdminActivityItem {
  title: string;
  description: string;
  timestamp: string;
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminPlatformService {
  private readonly http = inject(HttpClient);
  private readonly adminApiUrl = 'http://localhost:8081/api/admin';

  getOverviewStats(): Observable<AdminOverviewStatsResponse> {
    return this.http.get<AdminOverviewStatsResponse>(`${this.adminApiUrl}/statistics/overview`).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, 'Chargement des statistiques impossible.'))))
    );
  }

  getApplicationsByStatus(): Observable<ChartDataResponse> {
    return this.http.get<ChartDataResponse>(`${this.adminApiUrl}/statistics/applications-by-status`).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, 'Chargement des statuts de candidatures impossible.'))))
    );
  }

  getOffersByMonth(): Observable<ChartDataResponse> {
    return this.http.get<ChartDataResponse>(`${this.adminApiUrl}/statistics/offers-by-month`).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, 'Chargement des offres par mois impossible.'))))
    );
  }

  getApplicationsByMonth(): Observable<ChartDataResponse> {
    return this.http.get<ChartDataResponse>(`${this.adminApiUrl}/statistics/applications-by-month`).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, 'Chargement des candidatures par mois impossible.'))))
    );
  }

  getTopSkills(): Observable<TopSkillItem[]> {
    return this.http.get<TopSkillItem[]>(`${this.adminApiUrl}/statistics/top-skills`).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, 'Chargement des competences les plus recherchees impossible.'))))
    );
  }

  getAiTestStats(): Observable<AiTestStatsResponse> {
    return this.http.get<AiTestStatsResponse>(`${this.adminApiUrl}/statistics/ai-tests`).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, 'Chargement des statistiques Test IA impossible.'))))
    );
  }

  getInsights(): Observable<AiInsightItem[]> {
    return this.http.get<AiInsightItem[]>(`${this.adminApiUrl}/statistics/insights`).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, 'Chargement des insights IA impossible.'))))
    );
  }

  getSystemHealth(): Observable<ServiceHealthItem[]> {
    return this.http.get<ServiceHealthItem[]>(`${this.adminApiUrl}/system-health`).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, 'Chargement de la santé des services impossible.'))))
    );
  }

  getRecentActivity(): Observable<AdminActivityItem[]> {
    return this.http.get<AdminActivityItem[]>(`${this.adminApiUrl}/activity/recent`).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, 'Chargement de l’activité récente impossible.'))))
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
}
