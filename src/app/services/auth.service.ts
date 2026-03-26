import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  role: string;
  message: string;
  token: string;
}

export interface CandidateRegisterPayload {
  email: string;
  password: string;
  username: string;
  phoneNumber: string;
  role: 'CANDIDATE';
}

export interface RecruiterRegisterPayload {
  email: string;
  username: string;
  password: string;
  fonction: string;
  poste: string;
  departement: string;
  identreprise: number | null;
}

export interface RegisterResult {
  id: number;
  email: string;
  nom: string;
  role: string;
  message: string;
  success: boolean;
  statutCompte: boolean;
}

export interface MessageResult {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8081/api/auth';
  private readonly tokenKey = 'recrutement_front_token';
  private readonly userKey = 'recrutement_front_user';
  private readonly registerKey = 'recrutement_front_register_result';

  login(payload: LoginPayload): Observable<AuthUser> {
    return this.http.post<AuthUser>(`${this.apiUrl}/login`, payload).pipe(
      tap((response) => this.persistSession(response)),
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, 'Connexion impossible.'))))
    );
  }

  registerCandidate(payload: CandidateRegisterPayload): Observable<RegisterResult> {
    return this.http.post<RegisterResult>(`${this.apiUrl}/register/candidate`, payload).pipe(
      tap((response) => this.persistRegistration(response)),
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, 'Inscription candidat impossible.'))))
    );
  }

  registerRecruiter(payload: RecruiterRegisterPayload): Observable<RegisterResult> {
    return this.http.post<RegisterResult>(`${this.apiUrl}/register/recruiter`, payload).pipe(
      tap((response) => this.persistRegistration(response)),
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, 'Inscription recruteur impossible.'))))
    );
  }

  activateAccount(token: string): Observable<string> {
    return this.http.get(`${this.apiUrl}/verified-email?token=${encodeURIComponent(token)}`, {
      responseType: 'text'
    }).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, 'Activation du compte impossible.'))))
    );
  }

  forgotPassword(payload: ForgotPasswordPayload): Observable<MessageResult> {
    return this.http.post<MessageResult>(`${this.apiUrl}/forgot-password`, payload).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, 'Demande de reinitialisation impossible.'))))
    );
  }

  resetPassword(payload: ResetPasswordPayload): Observable<MessageResult> {
    return this.http.post<MessageResult>(`${this.apiUrl}/reset-password`, payload).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, 'Reinitialisation du mot de passe impossible.'))))
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  getLastRegistration(): RegisterResult | null {
    const rawRegister = localStorage.getItem(this.registerKey);

    if (!rawRegister) {
      return null;
    }

    try {
      return JSON.parse(rawRegister) as RegisterResult;
    } catch {
      localStorage.removeItem(this.registerKey);
      return null;
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getCurrentUser(): AuthUser | null {
    const rawUser = localStorage.getItem(this.userKey);

    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser) as AuthUser;
    } catch {
      this.logout();
      return null;
    }
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getCurrentRole(): string {
    const role = this.getCurrentUser()?.role ?? '';
    return role.replace('ROLE_', '').toUpperCase();
  }

  isAdmin(): boolean {
    return this.getCurrentRole() === 'ADMIN';
  }

  hasUserAccess(): boolean {
    return ['ADMIN', 'CANDIDATE', 'RECRUITER'].includes(this.getCurrentRole());
  }

  private persistSession(user: AuthUser): void {
    localStorage.setItem(this.tokenKey, user.token);
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  private persistRegistration(result: RegisterResult): void {
    localStorage.setItem(this.registerKey, JSON.stringify(result));
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
