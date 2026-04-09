import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

export interface CandidateEducationItem {
  title: string;
  degree: string;
  institute: string;
  year: string;
}

export interface CandidateSkillItem {
  competenceId?: number | null;
  title: string;
  level?: string;
  yearsExperience?: string;
  percentage: number;
}

export interface CandidateProfilePayload {
  fullName: string;
  profession: string;
  email: string;
  birthDate: string;
  phone: string;
  jobTitle: string;
  address: string;
  gender: string;
  description: string;
  education: CandidateEducationItem[];
  skills: CandidateSkillItem[];
  socialLinks: {
    facebook: string;
    instagram: string;
    linkedin: string;
    github: string;
  };
}

export interface CandidateProfileResponse {
  id: number;
  fullName: string;
  profession: string;
  email: string;
  birthDate: string;
  phone: string;
  jobTitle: string;
  address: string;
  gender: string;
  description: string;
  educationJson: string;
  skillsJson: string;
  facebook: string;
  instagram: string;
  linkedin: string;
  github: string;
  profilePhotoName: string;
  coverPhotoName: string;
  cvFileName: string;
  cvFileSize: string;
}

@Injectable({
  providedIn: 'root'
})
export class CandidateProfileService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8081/api/candidate/profile';

  getCurrentProfile(): Observable<CandidateProfileResponse> {
    return this.http.get<CandidateProfileResponse>(this.apiUrl).pipe(
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error, 'Chargement du profil candidat impossible.')))
      )
    );
  }

  saveCurrentProfile(
    payload: CandidateProfilePayload,
    files: {
      profilePhoto?: File | null;
      coverPhoto?: File | null;
      cvFile?: File | null;
    }
  ): Observable<CandidateProfileResponse> {
    const formData = new FormData();
    formData.append(
      'profile',
      new Blob([JSON.stringify(payload)], { type: 'application/json' })
    );

    if (files.profilePhoto) {
      formData.append('profilePhoto', files.profilePhoto);
    }

    if (files.coverPhoto) {
      formData.append('coverPhoto', files.coverPhoto);
    }

    if (files.cvFile) {
      formData.append('cvFile', files.cvFile);
    }

    return this.http.put<CandidateProfileResponse>(this.apiUrl, formData).pipe(
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error, "Enregistrement du profil candidat impossible.")))
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
