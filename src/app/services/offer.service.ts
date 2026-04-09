import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type OfferSkillType = 'OBLIGATOIRE' | 'SOUHAITEE';

export interface OfferSkillRequirement {
  competenceId: number | null;
  nom: string;
  type: OfferSkillType;
  ponderation: number;
  niveau: string;
}

export interface OfferPayload {
  titre: string;
  categorie: string;
  description: string;
  localisation: string;
  salaire: number;
  devise: string;
  nombrePostes: number;
  experienceRequise: string;
  typeContrat: string;
  statut: string;
  dateExpiration: string;
  competences: OfferSkillRequirement[];
}

export interface OfferResponse extends OfferPayload {
  id: number;
  datePublication: string;
  nomEntreprise: string;
  recruiterId: number;
  compatibilityScore?: number | null;
  alreadyApplied?: boolean;
  applicationStatus?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class OfferService {
  private readonly http = inject(HttpClient);
  private readonly publicApiUrl = 'http://localhost:8081/api/offres';
  private readonly recruiterApiUrl = 'http://localhost:8081/api/recruiter/offres';

  getOffers(): Observable<OfferResponse[]> {
    return this.http.get<OfferResponse[]>(this.publicApiUrl);
  }

  getOfferById(id: number): Observable<OfferResponse> {
    return this.http.get<OfferResponse>(`${this.publicApiUrl}/${id}`);
  }

  getRecruiterOffers(): Observable<OfferResponse[]> {
    return this.http.get<OfferResponse[]>(this.recruiterApiUrl);
  }

  createOffer(payload: OfferPayload): Observable<OfferResponse> {
    return this.http.post<OfferResponse>(this.recruiterApiUrl, payload);
  }

  updateOffer(id: number, payload: OfferPayload): Observable<OfferResponse> {
    return this.http.put<OfferResponse>(`${this.recruiterApiUrl}/${id}`, payload);
  }
}
