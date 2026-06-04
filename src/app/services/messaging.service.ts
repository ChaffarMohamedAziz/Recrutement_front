import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface ConversationSummary {
  applicationId: number;
  offerId: number | null;
  offerTitle: string;
  companyName: string;
  counterpartName: string;
  counterpartEmail: string;
  counterpartRole: string;
  status: string;
  score: number;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface ConversationMessage {
  id: number;
  applicationId: number;
  senderId: number;
  senderName: string;
  senderRole: string;
  recipientId: number;
  content: string;
  sentAt: string;
  read: boolean;
  ownMessage: boolean;
}

export interface MessageResult {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class MessagingService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8081/api/messages';

  getConversations(): Observable<ConversationSummary[]> {
    return this.http.get<ConversationSummary[]>(`${this.apiUrl}/conversations`).pipe(
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error, 'Chargement des conversations impossible.')))
      )
    );
  }

  getConversationMessages(applicationId: number): Observable<ConversationMessage[]> {
    return this.http.get<ConversationMessage[]>(`${this.apiUrl}/conversations/${applicationId}`).pipe(
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error, 'Chargement des messages impossible.')))
      )
    );
  }

  sendMessage(applicationId: number, content: string): Observable<ConversationMessage> {
    return this.http.post<ConversationMessage>(`${this.apiUrl}/conversations/${applicationId}`, { content }).pipe(
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error, 'Envoi du message impossible.')))
      )
    );
  }

  markConversationAsRead(applicationId: number): Observable<MessageResult> {
    return this.http.post<MessageResult>(`${this.apiUrl}/conversations/${applicationId}/mark-read`, {}).pipe(
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.extractErrorMessage(error, 'Mise a jour de la conversation impossible.')))
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
