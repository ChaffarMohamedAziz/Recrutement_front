import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  AssistantCandidateSearchResponse,
  AssistantCandidateSuggestion,
  AssistantChatPayload,
  AssistantChatResponse,
  CandidateTopMatchingOfferResponse,
  AssistantInterviewQuestionsResponse,
  AssistantOfferDraftResponse,
  AssistantService
} from '../services/assistant.service';
import { AuthService } from '../services/auth.service';
import { OfferResponse, OfferService } from '../services/offer.service';
import { PageHeroComponent } from '../shared/page-hero/page-hero.component';

type AssistantContextType =
  | 'GENERAL'
  | 'CANDIDATE_PROFILE'
  | 'JOB_OFFER'
  | 'APPLICATION'
  | 'INTERVIEW'
  | 'AI_TEST';

interface QuickAction {
  label: string;
  message: string;
  contextType?: AssistantContextType;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  createdAt: string;
  source?: string;
  suggestions?: string[];
}

@Component({
  selector: 'app-assistant-hub',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeroComponent],
  templateUrl: './assistant-hub.component.html',
  styleUrl: './assistant-hub.component.css'
})
export class AssistantHubComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly assistantService = inject(AssistantService);
  private readonly offerService = inject(OfferService);

  readonly role = this.authService.getCurrentRole();
  readonly isRecruiter = this.role === 'RECRUITER';
  readonly isCandidate = this.role === 'CANDIDATE';
  private readonly historyStorageKey = `smart-recruit-assistant-history-${this.role?.toLowerCase() || 'guest'}`;

  recruiterOffers: OfferResponse[] = [];
  topMatchingOffers: CandidateTopMatchingOfferResponse[] = [];
  candidateOfferSearch = '';
  candidateMatchingMinScore = 70;
  errorMessage = '';
  successMessage = '';
  chatInput = '';
  activeContextType: AssistantContextType = 'GENERAL';
  chatHistory: ChatMessage[] = [];

  offerDraftForm = {
    title: '',
    category: 'Informatique & technologie',
    location: 'Tunis',
    contractType: 'CDI',
    experienceLevel: '2-4 ans',
    tone: 'Professionnel et attractif',
    context: '',
    skillsText: ''
  };

  candidateSearchForm = {
    query: '',
    offerId: null as number | null,
    limit: 6
  };

  interviewForm = {
    offerTitle: '',
    jobDescription: '',
    seniority: 'Intermediaire',
    count: 6,
    focusSkillsText: ''
  };

  generatingDraft = false;
  searchingCandidates = false;
  generatingQuestions = false;
  askingAssistant = false;
  loadingTopMatchingOffers = false;

  draftResult: AssistantOfferDraftResponse | null = null;
  searchResult: AssistantCandidateSearchResponse | null = null;
  interviewResult: AssistantInterviewQuestionsResponse | null = null;

  readonly candidateQuickActions: QuickAction[] = [
    {
      label: 'Comment ameliorer mon profil ?',
      message: 'Comment ameliorer mon profil pour attirer davantage les recruteurs ?',
      contextType: 'CANDIDATE_PROFILE'
    },
    {
      label: 'Quelles competences ajouter ?',
      message: 'Quelles competences devrais-je ajouter ou mieux valoriser sur mon profil ?',
      contextType: 'CANDIDATE_PROFILE'
    },
    {
      label: 'Comment preparer mon entretien ?',
      message: 'Comment me preparer efficacement a un entretien technique et RH ?',
      contextType: 'INTERVIEW'
    },
    {
      label: 'Explique mon score de matching',
      message: 'Explique-moi comment mieux comprendre et ameliorer mon score de matching.',
      contextType: 'APPLICATION'
    },
    {
      label: 'Conseils pour mon CV',
      message: 'Donne-moi des conseils concrets pour rendre mon CV plus convaincant.',
      contextType: 'CANDIDATE_PROFILE'
    }
  ];

  readonly recruiterQuickActions: QuickAction[] = [
    {
      label: 'Generer une description d offre',
      message: 'Aide-moi a generer une description d offre claire, attractive et precise.',
      contextType: 'JOB_OFFER'
    },
    {
      label: 'Proposer des questions d entretien',
      message: 'Propose-moi une serie de questions d entretien pertinentes pour mon besoin.',
      contextType: 'INTERVIEW'
    },
    {
      label: 'Analyser ce candidat',
      message: 'Resume les points forts, les points faibles et le niveau de risque de ce candidat.',
      contextType: 'APPLICATION'
    },
    {
      label: 'Generer un email de refus',
      message: 'Redige un email de refus professionnel, humain et respectueux.',
      contextType: 'APPLICATION'
    },
    {
      label: 'Preparer un entretien',
      message: 'Aide-moi a preparer un entretien avec une structure, des questions et des points d attention.',
      contextType: 'INTERVIEW'
    },
    {
      label: 'Trouver des candidats pertinents',
      message: 'Aide-moi a formuler une recherche pour identifier rapidement les meilleurs candidats.',
      contextType: 'JOB_OFFER'
    }
  ];

  ngOnInit(): void {
    this.restoreHistory();
    if (!this.chatHistory.length) {
      this.seedInitialAssistantMessage();
    }

    if (this.isRecruiter) {
      this.loadRecruiterOffers();
    } else if (this.isCandidate) {
      this.loadCandidateTopMatchingOffers();
    }
  }

  get heroBadge(): string {
    return this.isRecruiter ? 'Assistant IA recruteur' : 'Assistant IA candidat';
  }

  get heroTitle(): string {
    return this.isRecruiter
      ? 'Activez un copilote IA pour accelerer la creation d offres, la recherche de talents et la preparation des entretiens.'
      : 'Appuyez-vous sur un assistant IA pour mieux vous orienter sur la plateforme et valoriser votre profil.';
  }

  get heroSubtitle(): string {
    return this.isRecruiter
      ? 'Discutez avec l assistant, lancez vos actions rapides et exploitez vos outils IA sans quitter Smart Recruit.'
      : 'Posez vos questions, obtenez des conseils concrets et identifiez vos priorites pour ameliorer votre dossier candidat.';
  }

  get quickActions(): QuickAction[] {
    return this.isRecruiter ? this.recruiterQuickActions : this.candidateQuickActions;
  }

  get conversationCount(): number {
    return this.chatHistory.filter((item) => item.sender === 'assistant').length;
  }

  get latestAssistantSuggestions(): string[] {
    const reversed = [...this.chatHistory].reverse();
    const assistantMessage = reversed.find((item) => item.sender === 'assistant' && item.suggestions?.length);
    return assistantMessage?.suggestions ?? [];
  }

  get filteredTopMatchingOffers(): CandidateTopMatchingOfferResponse[] {
    const search = this.candidateOfferSearch.trim().toLowerCase();
    const scoped = this.topMatchingOffers.filter((offer) => {
      if ((offer.matchingScore ?? 0) < this.candidateMatchingMinScore) {
        return false;
      }

      if (!search) {
        return true;
      }

      const haystack = [
        offer.title,
        offer.companyName,
        offer.location,
        offer.contractType,
        ...(offer.matchingSkills ?? []),
        ...(offer.missingSkills ?? [])
      ].join(' ').toLowerCase();

      return haystack.includes(search);
    });

    return search ? scoped : scoped.slice(0, 6);
  }

  sendChatMessage(message?: string, contextType?: AssistantContextType, targetId?: number | null): void {
    const resolved = (message ?? this.chatInput).trim();
    if (!resolved || this.askingAssistant) {
      return;
    }

    const userMessage: ChatMessage = {
      id: this.buildMessageId('user'),
      sender: 'user',
      text: resolved,
      createdAt: new Date().toISOString()
    };

    this.chatHistory = [...this.chatHistory, userMessage];
    this.persistHistory();
    this.askingAssistant = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload: AssistantChatPayload = {
      message: resolved,
      prompt: resolved,
      contextType: contextType ?? this.activeContextType,
      targetId: targetId ?? null,
      history: this.chatHistory.slice(-10).map((item) => `${item.sender}: ${item.text}`)
    };

    this.assistantService.chat(payload).subscribe({
      next: (result) => {
        this.askingAssistant = false;
        this.chatInput = '';
        this.pushAssistantAnswer(result);
      },
      error: (error: { message?: string }) => {
        this.askingAssistant = false;
        this.errorMessage = error.message || "L'assistant IA est indisponible.";
      }
    });
  }

  runQuickAction(action: QuickAction | string): void {
    if (typeof action === 'string') {
      this.sendChatMessage(action);
      return;
    }

    this.activeContextType = action.contextType ?? 'GENERAL';
    this.sendChatMessage(action.message, action.contextType);
  }

  clearConversation(): void {
    this.chatHistory = [];
    this.chatInput = '';
    sessionStorage.removeItem(this.historyStorageKey);
    this.seedInitialAssistantMessage();
    this.successMessage = 'Conversation effacee.';
    this.errorMessage = '';
  }

  generateOfferDraft(): void {
    if (this.generatingDraft) {
      return;
    }

    this.generatingDraft = true;
    this.errorMessage = '';

    this.assistantService.generateOfferDraft({
      title: this.offerDraftForm.title,
      category: this.offerDraftForm.category,
      location: this.offerDraftForm.location,
      contractType: this.offerDraftForm.contractType,
      experienceLevel: this.offerDraftForm.experienceLevel,
      tone: this.offerDraftForm.tone,
      context: this.offerDraftForm.context,
      skills: this.parseCommaList(this.offerDraftForm.skillsText)
    }).subscribe({
      next: (result) => {
        this.generatingDraft = false;
        this.draftResult = result;
      },
      error: (error: { message?: string }) => {
        this.generatingDraft = false;
        this.errorMessage = error.message || 'Generation de la description impossible.';
      }
    });
  }

  searchCandidates(): void {
    if (this.searchingCandidates) {
      return;
    }

    this.searchingCandidates = true;
    this.errorMessage = '';

    this.assistantService.findCandidates({
      query: this.candidateSearchForm.query,
      offerId: this.candidateSearchForm.offerId,
      limit: this.candidateSearchForm.limit
    }).subscribe({
      next: (result) => {
        this.searchingCandidates = false;
        this.searchResult = result;
      },
      error: (error: { message?: string }) => {
        this.searchingCandidates = false;
        this.errorMessage = error.message || 'Recherche IA de candidats impossible.';
      }
    });
  }

  generateInterviewQuestions(): void {
    if (this.generatingQuestions) {
      return;
    }

    this.generatingQuestions = true;
    this.errorMessage = '';

    this.assistantService.suggestInterviewQuestions({
      offerTitle: this.interviewForm.offerTitle,
      jobDescription: this.interviewForm.jobDescription,
      seniority: this.interviewForm.seniority,
      count: this.interviewForm.count,
      focusSkills: this.parseCommaList(this.interviewForm.focusSkillsText)
    }).subscribe({
      next: (result) => {
        this.generatingQuestions = false;
        this.interviewResult = result;
      },
      error: (error: { message?: string }) => {
        this.generatingQuestions = false;
        this.errorMessage = error.message || 'Generation des questions impossible.';
      }
    });
  }

  askForOfferAdvice(offer: CandidateTopMatchingOfferResponse): void {
    this.activeContextType = 'JOB_OFFER';
    const prompt = `Comment ameliorer mon profil pour l'offre "${offer.title}" chez ${offer.companyName} ? `
      + `Mon score actuel est de ${Math.round(offer.matchingScore || 0)}%. `
      + `Competences compatibles : ${offer.matchingSkills.join(', ') || 'aucune'}. `
      + `Competences manquantes : ${offer.missingSkills.join(', ') || 'aucune'}.`;
    this.sendChatMessage(prompt, 'JOB_OFFER', offer.offerId);
  }

  applyOfferContext(): void {
    const selectedOffer = this.recruiterOffers.find((item) => item.id === this.candidateSearchForm.offerId);
    if (!selectedOffer) {
      return;
    }

    this.interviewForm.offerTitle = selectedOffer.titre;
    this.interviewForm.jobDescription = selectedOffer.description;
    this.interviewForm.focusSkillsText = selectedOffer.competences.map((item) => item.nom).join(', ');
  }

  private pushAssistantAnswer(result: AssistantChatResponse): void {
    const answer = result.response || result.content || result.message || 'Reponse de l assistant indisponible.';
    const assistantMessage: ChatMessage = {
      id: this.buildMessageId('assistant'),
      sender: 'assistant',
      text: answer,
      createdAt: result.createdAt || new Date().toISOString(),
      source: result.source || 'assistant',
      suggestions: result.suggestions ?? []
    };

    this.chatHistory = [...this.chatHistory, assistantMessage];
    this.persistHistory();
  }

  private restoreHistory(): void {
    const raw = sessionStorage.getItem(this.historyStorageKey);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as ChatMessage[];
      if (Array.isArray(parsed)) {
        this.chatHistory = parsed.filter((item) => !!item?.text && !!item?.sender);
      }
    } catch {
      this.chatHistory = [];
    }
  }

  private persistHistory(): void {
    sessionStorage.setItem(this.historyStorageKey, JSON.stringify(this.chatHistory));
  }

  private seedInitialAssistantMessage(): void {
    const welcomeText = this.isRecruiter
      ? 'Bonjour, je suis votre Assistant IA Smart Recruit. Je peux vous aider a generer une offre, analyser un candidat, preparer un entretien ou rediger un email professionnel.'
      : 'Bonjour, je suis votre Assistant IA Smart Recruit. Je peux vous aider a ameliorer votre profil, mieux presenter votre CV, comprendre votre matching et preparer vos entretiens.';

    this.chatHistory = [{
      id: this.buildMessageId('assistant'),
      sender: 'assistant',
      text: welcomeText,
      createdAt: new Date().toISOString(),
      source: 'assistant',
      suggestions: this.quickActions.slice(0, 3).map((item) => item.label)
    }];
    this.persistHistory();
  }

  private loadRecruiterOffers(): void {
    this.offerService.getRecruiterOffers().subscribe({
      next: (offers) => {
        this.recruiterOffers = offers;
      },
      error: (error: { message?: string }) => {
        this.errorMessage = error.message || 'Chargement des offres recruteur impossible.';
      }
    });
  }

  private loadCandidateTopMatchingOffers(): void {
    this.loadingTopMatchingOffers = true;
    this.assistantService.getCandidateTopMatchingOffers(0).subscribe({
      next: (offers) => {
        this.topMatchingOffers = offers ?? [];
        this.loadingTopMatchingOffers = false;
      },
      error: (error: { message?: string }) => {
        this.loadingTopMatchingOffers = false;
        this.errorMessage = error.message || 'Chargement des meilleures offres impossible.';
      }
    });
  }

  private parseCommaList(value: string): string[] {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private buildMessageId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  canOpenCandidateProfile(candidate: AssistantCandidateSuggestion): boolean {
    return Number.isFinite(Number(candidate.candidateId)) && Number(candidate.candidateId) > 0;
  }
}
