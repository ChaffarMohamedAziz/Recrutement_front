import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ConversationMessage, ConversationSummary, MessagingService } from '../services/messaging.service';
import { PageHeroComponent } from '../shared/page-hero/page-hero.component';

@Component({
  selector: 'app-messages-hub',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeroComponent],
  templateUrl: './messages-hub.component.html',
  styleUrl: './messages-hub.component.css'
})
export class MessagesHubComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly messagingService = inject(MessagingService);
  private readonly route = inject(ActivatedRoute);

  readonly user = this.authService.getCurrentUser();
  readonly role = this.authService.getCurrentRole();

  conversations: ConversationSummary[] = [];
  messages: ConversationMessage[] = [];
  draftMessage = '';
  errorMessage = '';
  loadingConversations = false;
  loadingMessages = false;
  sending = false;
  selectedApplicationId: number | null = null;

  private refreshHandle: number | null = null;
  private pendingApplicationId: number | null = null;

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const applicationId = Number(params.get('applicationId'));
      this.pendingApplicationId = Number.isFinite(applicationId) && applicationId > 0 ? applicationId : null;
      if (this.conversations.length) {
        this.reconcileSelectedConversation();
      }
    });

    this.loadConversations();
    this.refreshHandle = window.setInterval(() => {
      this.loadConversations(true);
      if (this.selectedApplicationId) {
        this.loadMessages(this.selectedApplicationId, true);
      }
    }, 7000);
  }

  ngOnDestroy(): void {
    if (this.refreshHandle !== null) {
      window.clearInterval(this.refreshHandle);
    }
  }

  get selectedConversation(): ConversationSummary | null {
    return this.conversations.find((item) => item.applicationId === this.selectedApplicationId) ?? null;
  }

  get unreadConversationCount(): number {
    return this.conversations.reduce((sum, item) => sum + item.unreadCount, 0);
  }

  get heroTitle(): string {
    return this.role === 'RECRUITER'
      ? 'Centralisez vos echanges avec les candidats et gardez une trace claire de chaque conversation.'
      : 'Echangez directement avec les recruteurs pour faire avancer vos candidatures sans sortir de la plateforme.';
  }

  get heroSubtitle(): string {
    return this.role === 'RECRUITER'
      ? 'Chaque conversation reste rattachee a une candidature precise, ce qui simplifie le suivi et la prise de decision.'
      : 'Retrouvez les messages lies a chaque offre, repondez rapidement et suivez les prochains echanges depuis un seul espace.';
  }

  get heroTheme(): 'candidate' | 'recruiter' {
    return this.role === 'RECRUITER' ? 'recruiter' : 'candidate';
  }

  get heroBadge(): string {
    return this.role === 'RECRUITER' ? 'Messagerie recruteur' : 'Messagerie candidat';
  }

  get heroVariant(): 'communication' {
    return 'communication';
  }

  openConversation(applicationId: number): void {
    if (this.selectedApplicationId === applicationId && this.messages.length) {
      return;
    }

    this.selectedApplicationId = applicationId;
    this.loadMessages(applicationId);
  }

  sendMessage(): void {
    if (!this.selectedApplicationId || this.sending || !this.draftMessage.trim()) {
      return;
    }

    this.sending = true;
    this.errorMessage = '';

    this.messagingService.sendMessage(this.selectedApplicationId, this.draftMessage.trim()).subscribe({
      next: () => {
        const applicationId = this.selectedApplicationId!;
        this.draftMessage = '';
        this.sending = false;
        this.loadMessages(applicationId, true);
        this.loadConversations(true);
      },
      error: (error: { message?: string }) => {
        this.sending = false;
        this.errorMessage = error.message || 'Envoi du message impossible.';
      }
    });
  }

  private loadConversations(silent = false): void {
    if (!silent) {
      this.loadingConversations = true;
    }

    this.messagingService.getConversations().subscribe({
      next: (conversations) => {
        this.conversations = conversations;
        this.loadingConversations = false;
        this.reconcileSelectedConversation();
      },
      error: (error: { message?: string }) => {
        this.loadingConversations = false;
        this.errorMessage = error.message || 'Chargement des conversations impossible.';
      }
    });
  }

  private reconcileSelectedConversation(): void {
    const preferredId = this.pendingApplicationId ?? this.selectedApplicationId;

    if (preferredId && this.conversations.some((item) => item.applicationId === preferredId)) {
      this.pendingApplicationId = null;
      this.openConversation(preferredId);
      return;
    }

    if (!this.selectedApplicationId && this.conversations.length) {
      this.openConversation(this.conversations[0].applicationId);
      return;
    }

    if (this.selectedApplicationId && !this.conversations.some((item) => item.applicationId === this.selectedApplicationId)) {
      this.selectedApplicationId = null;
      this.messages = [];
      if (this.conversations.length) {
        this.openConversation(this.conversations[0].applicationId);
      }
    }
  }

  private loadMessages(applicationId: number, silent = false): void {
    if (!silent) {
      this.loadingMessages = true;
    }

    this.messagingService.getConversationMessages(applicationId).subscribe({
      next: (messages) => {
        this.messages = messages;
        this.loadingMessages = false;

        this.conversations = this.conversations.map((item) =>
          item.applicationId === applicationId
            ? { ...item, unreadCount: 0 }
            : item
        );
      },
      error: (error: { message?: string }) => {
        this.loadingMessages = false;
        this.errorMessage = error.message || 'Chargement des messages impossible.';
      }
    });
  }
}
