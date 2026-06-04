import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface ContactMessagePayload {
  nom?: string;
  fullName: string;
  email: string;
  subject: string;
  message: string;
}

export interface ContactMessageResponse {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContactService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8081/api/contact';

  sendMessage(payload: ContactMessagePayload): Observable<ContactMessageResponse> {
    return this.envoyerMessageContact(payload);
  }

  envoyerMessageContact(data: ContactMessagePayload): Observable<ContactMessageResponse> {
    return this.http.post<ContactMessageResponse>(this.apiUrl, data).pipe(
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error)))
      )
    );
  }

  private extractErrorMessage(error: HttpErrorResponse): string {
    if (typeof error.error === 'string' && error.error.trim()) {
      return error.error;
    }

    if (error.error?.message) {
      return error.error.message;
    }

    if (error.status === 0) {
      return 'Backend indisponible. Vérifiez que Spring Boot tourne sur le port 8081.';
    }

    return 'Erreur lors de l’envoi du message. Veuillez réessayer.';
  }
}
