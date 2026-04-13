import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  AssistantCandidateSearchResponse,
  AssistantChatResponse,
  AssistantInterviewQuestionsResponse,
  AssistantOfferDraftResponse,
  AssistantService
} from '../services/assistant.service';
import { AuthService } from '../services/auth.service';
import { OfferResponse, OfferService } from '../services/offer.service';
import { PageHeroComponent } from '../shared/page-hero/page-hero.component';

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

  recruiterOffers: OfferResponse[] = [];
  errorMessage = '';

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

  candidatePrompt = '';

  generatingDraft = false;
  searchingCandidates = false;
  generatingQuestions = false;
  askingAssistant = false;

  draftResult: AssistantOfferDraftResponse | null = null;
  searchResult: AssistantCandidateSearchResponse | null = null;
  interviewResult: AssistantInterviewQuestionsResponse | null = null;
  candidateResponse: AssistantChatResponse | null = null;

  readonly candidatePrompts = [
    'Comment renforcer mon profil pour viser un poste Full Stack ?',
    'Comment me preparer a un premier entretien technique ?',
    'Quels points de mon profil sont les plus importants pour attirer un recruteur ?'
  ];

  ngOnInit(): void {
    if (this.isRecruiter) {
      this.loadRecruiterOffers();
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
      ? 'Generez une description premium, explorez les profils en langage naturel et preparez des entretiens plus pertinents.'
      : 'Posez vos questions, obtenez des conseils concrets et identifiez les priorites pour ameliorer votre dossier candidat.';
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
        this.errorMessage = error.message || "Generation de la description impossible.";
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
        this.errorMessage = error.message || "Generation des questions impossible.";
      }
    });
  }

  askCandidateAssistant(prompt?: string): void {
    const message = (prompt ?? this.candidatePrompt).trim();
    if (!message || this.askingAssistant) {
      return;
    }

    this.askingAssistant = true;
    this.errorMessage = '';

    this.assistantService.coachCandidate({ prompt: message }).subscribe({
      next: (result) => {
        this.askingAssistant = false;
        this.candidatePrompt = message;
        this.candidateResponse = result;
      },
      error: (error: { message?: string }) => {
        this.askingAssistant = false;
        this.errorMessage = error.message || "L'assistant candidat est indisponible.";
      }
    });
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

  private parseCommaList(value: string): string[] {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
}
