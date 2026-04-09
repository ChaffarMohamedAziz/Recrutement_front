import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
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
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REFUSED';
  message: string;
  success: boolean;
  statutCompte: boolean;
}

export interface UserSummary {
  id: number;
  nom: string;
  email: string;
  role: string;
}

export interface UserProfile {
  id: number;
  nom: string;
  email: string;
  role: string;
  statutCompte: boolean;
  emailVerified: boolean;
  profileExists: boolean;
  profileMessage: string;
  numTelephone?: string;
  posteRecherche?: string;
  localisation?: string;
  experience?: number;
  fonction?: string;
  poste?: string;
  departement?: string;
  entreprise?: string;
}

export interface NotificationItem {
  id: number;
  message: string;
  dateEnvoi: string;
  lue: boolean;
}

export interface MessageResult {
  success: boolean;
  message: string;
}

export type SocialProvider = 'FACEBOOK' | 'GMAIL' | 'LINKEDIN';

export interface SocialAuthPayload {
  provider: SocialProvider;
  mode: 'LOGIN' | 'REGISTER';
  email: string;
  username?: string;
  role?: 'CANDIDATE' | 'RECRUITER';
  phoneNumber?: string;
  fonction?: string;
  poste?: string;
  departement?: string;
}

export interface SocialAuthResult {
  id: number;
  email: string;
  username: string;
  role: string;
  message: string;
  success: boolean;
  statutCompte: boolean;
  token: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8081/api/auth';
  private readonly adminApiUrl = 'http://localhost:8081/api/admin';
  private readonly tokenKey = 'recrutement_front_token';
  private readonly userKey = 'recrutement_front_user';
  private readonly registerKey = 'recrutement_front_register_result';

  login(payload: LoginPayload): Observable<AuthUser> {
    return this.http.post<AuthUser>(`${this.apiUrl}/login`, payload).pipe(
      tap((response) => this.persistSession(response)),
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, 'Connexion impossible.'))))
    );
  }

  socialAuth(payload: SocialAuthPayload): Observable<SocialAuthResult> {
    return this.http.post<SocialAuthResult>(`${this.apiUrl}/social`, payload).pipe(
      tap((response) => {
        if (response?.token) {
          this.persistSession({
            id: response.id,
            email: response.email,
            username: response.username,
            role: response.role,
            message: response.message,
            token: response.token
          });
        }
      }),
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, 'Connexion sociale impossible.'))))
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

  approveRecruiterAccount(recruiterId: number): Observable<RegisterResult> {
    return this.http.post<RegisterResult>(`${this.adminApiUrl}/recruiters/${recruiterId}/approve`, {}, {
      headers: this.buildAuthHeaders()
    }).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.extractErrorMessage(error, "Activation du compte recruteur impossible."))))
    );
  }

  rejectRecruiterAccount(recruiterId: number): Observable<MessageResult> {
    return this.http.post<MessageResult>(`${this.adminApiUrl}/recruiters/${recruiterId}/reject`, {}, {
      headers: this.buildAuthHeaders()
    }).pipe(
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error, "Refus du compte recruteur impossible.")))
      )
    );
  }

  getRecruiterAccounts(): Observable<RegisterResult[]> {
    return this.http.get<RegisterResult[]>(`${this.adminApiUrl}/recruiters`, {
      headers: this.buildAuthHeaders()
    }).pipe(
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error, "Chargement des comptes recruteurs impossible.")))
      )
    );
  }

  deleteRecruiterAccount(recruiterId: number): Observable<MessageResult> {
    return this.http.delete<MessageResult>(`${this.adminApiUrl}/recruiters/${recruiterId}`, {
      headers: this.buildAuthHeaders()
    }).pipe(
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error, "Suppression du compte recruteur impossible.")))
      )
    );
  }

  getUsers(query?: string): Observable<UserSummary[]> {
    const queryParam = query ? `?query=${encodeURIComponent(query)}` : '';
    return this.http.get<UserSummary[]>(`${this.adminApiUrl}/users${queryParam}`, {
      headers: this.buildAuthHeaders()
    }).pipe(
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error, "Chargement des utilisateurs impossible.")))
      )
    );
  }

  getUserById(userId: number): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.adminApiUrl}/users/${userId}`, {
      headers: this.buildAuthHeaders()
    }).pipe(
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error, "Chargement du profil utilisateur impossible.")))
      )
    );
  }

  deleteUser(userId: number): Observable<MessageResult> {
    return this.http.delete<MessageResult>(`${this.adminApiUrl}/users/${userId}`, {
      headers: this.buildAuthHeaders()
    }).pipe(
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error, "Suppression de l'utilisateur impossible.")))
      )
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
    localStorage.removeItem(this.registerKey);
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

  updateCurrentUser(username: string, email?: string): void {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return;
    }

    const updatedUser: AuthUser = {
      ...currentUser,
      username: username || currentUser.username,
      email: email || currentUser.email
    };

    localStorage.setItem(this.userKey, JSON.stringify(updatedUser));
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }

    if (this.isTokenExpired(token)) {
      this.logout();
      return false;
    }

    return true;
  }

  getCurrentRole(): string {
    const role = this.getCurrentUser()?.role ?? '';
    return role.replace('ROLE_', '').toUpperCase();
  }

  isAdmin(): boolean {
    return this.getCurrentRole() === 'ADMIN';
  }

  isRecruiter(): boolean {
    return this.getCurrentRole() === 'RECRUITER';
  }

  isCandidate(): boolean {
    return this.getCurrentRole() === 'CANDIDATE';
  }

  hasUserAccess(): boolean {
    return ['ADMIN', 'CANDIDATE', 'RECRUITER'].includes(this.getCurrentRole());
  }

  getRoleHomeRoute(): string {
    const role = this.getCurrentRole();

    if (role === 'ADMIN') {
      return '/admin-dashboard';
    }

    if (role === 'RECRUITER') {
      return '/recruiter-space';
    }

    if (role === 'CANDIDATE') {
      return '/candidate-space';
    }

    return '/home';
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

    if (error.error?.error) {
      return error.error.error;
    }

    if (error.status === 0) {
      return 'Backend indisponible. Verifiez que Spring Boot tourne sur le port 8081.';
    }

    if (error.status === 403) {
      return "Action non autorisee. Reconnectez-vous avec un compte administrateur.";
    }

    return fallback;
  }

  private buildAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    if (!token) {
      return new HttpHeaders();
    }
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  private isTokenExpired(token: string): boolean {
    const payload = this.decodeTokenPayload(token);
    if (!payload?.exp) {
      return false;
    }
    const expiryMs = payload.exp * 1000;
    return Date.now() >= expiryMs;
  }

  private decodeTokenPayload(token: string): { exp?: number } | null {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    try {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
      const json = atob(padded);
      return JSON.parse(json) as { exp?: number };
    } catch {
      return null;
    }
  }
}
