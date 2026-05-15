import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { ApplicationResponse, ApplicationService } from '../services/application.service';
import { AuthService } from '../services/auth.service';
import { MatchingCandidateResponse, OfferResponse, OfferService } from '../services/offer.service';
import {
  RecruiterCompanyPayload,
  RecruiterCompanyProfile,
  RecruiterCompanyService
} from '../services/recruiter-company.service';
import { ThemeService } from '../services/theme.service';
import { PageHeroComponent } from '../shared/page-hero/page-hero.component';

interface RecruiterStatCard {
  label: string;
  value: string;
  detail: string;
  tone: 'primary' | 'success' | 'warning' | 'neutral';
}

interface RecruiterInsightItem {
  title: string;
  description: string;
  tone: 'primary' | 'success' | 'warning' | 'neutral';
}

interface PriorityCandidateCard extends MatchingCandidateResponse {
  inviting?: boolean;
}

@Component({
  selector: 'app-recruiter-space',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ReactiveFormsModule, PageHeroComponent, BaseChartDirective],
  templateUrl: './recruiter-space.component.html',
  styleUrl: './recruiter-space.component.css'
})
export class RecruiterSpaceComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly offerService = inject(OfferService);
  private readonly applicationService = inject(ApplicationService);
  private readonly recruiterCompanyService = inject(RecruiterCompanyService);
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);

  readonly user = this.authService.getCurrentUser();
  readonly companyForm = this.fb.group({
    idEntreprise: [null as number | null],
    nomEntreprise: ['', [Validators.required, Validators.maxLength(120)]],
    secteur: ['', [Validators.required, Validators.maxLength(120)]],
    adresse: ['', [Validators.required, Validators.maxLength(180)]],
    email: ['', [Validators.required, Validators.email]],
    abonnementActif: ['NON', Validators.required],
    description: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(2000)]],
    siteWeb: ['', Validators.maxLength(255)]
  });
  readonly subscriptionOptions = ['OUI', 'NON'];
  recruiterOffers: OfferResponse[] = [];
  applications: ApplicationResponse[] = [];
  companyProfile: RecruiterCompanyProfile | null = null;
  loading = false;
  offersLoading = false;
  applicationsLoading = false;
  companyLoading = false;
  companySaving = false;
  offerActionId: number | null = null;
  offerActionType: 'archive' | 'unarchive' | 'delete' | null = null;
  matchingCandidatesLoading = false;
  priorityCandidates: PriorityCandidateCard[] = [];
  selectedOfferId: number | null = null;
  scoreMinimum = 70;
  errorMessage = '';
  successMessage = '';
  recruiterInsights: RecruiterInsightItem[] = [];

  weeklyApplicationsChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  pipelineChartData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  lineChartOptions: ChartConfiguration<'bar'>['options'] = {};
  doughnutOptions: ChartConfiguration<'doughnut'>['options'] = {};

  ngOnInit(): void {
    this.applyChartTheme();
    this.themeService.currentTheme$.subscribe(() => {
      this.applyChartTheme();
      this.refreshAnalytics();
    });
    this.loadWorkspace();
    this.loadCompanyProfile();
  }

  get userInitials(): string {
    const name = this.user?.username || 'Recruteur';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((item) => item.charAt(0).toUpperCase())
      .join('');
  }

  get kpis(): RecruiterStatCard[] {
    const interviews = this.applications.filter((item) => item.status === 'INTERVIEW').length;
    const aiTestsSent = this.applications.filter((item) => item.status === 'AI_TEST_SENT').length;
    const averageScore = this.applications.length
      ? Math.round(this.applications.reduce((sum, item) => sum + item.score, 0) / this.applications.length)
      : 0;
    const activeOffers = this.recruiterOffers.filter((item) => this.normalizeOfferStatus(item.statut) === 'PUBLIEE').length;

    return [
      {
        label: 'Offres actives',
        value: String(activeOffers).padStart(2, '0'),
        detail: 'Offres visibles cote candidat',
        tone: 'primary'
      },
      {
        label: 'Candidatures',
        value: String(this.applications.length).padStart(2, '0'),
        detail: 'Profils deja recus',
        tone: 'neutral'
      },
      {
        label: 'Tests IA',
        value: String(aiTestsSent).padStart(2, '0'),
        detail: 'Evaluations envoye es',
        tone: aiTestsSent ? 'warning' : 'neutral'
      },
      {
        label: 'Entretiens',
        value: String(interviews).padStart(2, '0'),
        detail: 'Candidatures qualifiees',
        tone: interviews ? 'success' : 'neutral'
      },
      {
        label: 'Score moyen',
        value: `${averageScore}%`,
        detail: 'Qualite moyenne du pipeline',
        tone: 'neutral'
      }
    ];
  }

  get recentOffers(): OfferResponse[] {
    return [...this.recruiterOffers]
      .sort((left, right) => new Date(right.datePublication).getTime() - new Date(left.datePublication).getTime())
      .slice(0, 4);
  }

  get allOffers(): OfferResponse[] {
    return [...this.recruiterOffers]
      .sort((left, right) => new Date(right.datePublication || 0).getTime() - new Date(left.datePublication || 0).getTime());
  }

  get visibleOffers(): OfferResponse[] {
    return this.allOffers.filter((item) => !this.isOfferArchived(item));
  }

  get archivedOffers(): OfferResponse[] {
    return this.allOffers.filter((item) => this.isOfferArchived(item));
  }

  get candidateSpotlights(): ApplicationResponse[] {
    return [...this.applications]
      .sort((left, right) => right.score - left.score)
      .slice(0, 4);
  }

  get activityRows(): Array<{ label: string; value: string; helper: string }> {
    return [
      {
        label: 'Offres publiees',
        value: String(this.recruiterOffers.filter((item) => this.normalizeOfferStatus(item.statut) === 'PUBLIEE').length),
        helper: 'Posts actifs dans votre espace'
      },
      {
        label: 'Profils retenus',
        value: String(this.applications.filter((item) => item.status === 'INTERVIEW').length),
        helper: 'Candidats qualifies pour entretien'
      },
      {
        label: 'Profils refuses',
        value: String(this.applications.filter((item) => item.status === 'REJECTED').length),
        helper: 'Historique du pipeline'
      }
    ];
  }

  get averageMatchingScoreValue(): number {
    return this.applications.length
      ? Math.round(this.applications.reduce((sum, item) => sum + item.score, 0) / this.applications.length)
      : 0;
  }

  get companyCompletionLabel(): string {
    if (this.companyProfile?.profileCompleted) {
      return 'Profil entreprise complet';
    }

    return 'Profil entreprise a completer';
  }

  createNewOffer(): void {
    this.router.navigate(['/post-a-job']);
  }

  editOffer(offer: OfferResponse): void {
    this.router.navigate(['/post-a-job'], { queryParams: { editOfferId: offer.id } });
  }

  archiveOffer(offer: OfferResponse): void {
    if (this.offerActionId !== null || this.isOfferArchived(offer)) {
      return;
    }

    this.offerActionId = offer.id;
    this.offerActionType = 'archive';
    this.errorMessage = '';
    this.successMessage = '';

    this.offerService.archiveOffer(offer).subscribe({
      next: (updatedOffer) => {
        this.offerActionId = null;
        this.offerActionType = null;
        this.upsertOffer(updatedOffer);
        this.successMessage = `L'offre "${updatedOffer.titre}" a ete archivee avec succes.`;
      },
      error: (error: { message?: string }) => {
        this.offerActionId = null;
        this.offerActionType = null;
        this.errorMessage = error.message || "Archivage de l'offre impossible.";
      }
    });
  }

  unarchiveOffer(offer: OfferResponse): void {
    if (this.offerActionId !== null || !this.isOfferArchived(offer)) {
      return;
    }

    this.offerActionId = offer.id;
    this.offerActionType = 'unarchive';
    this.errorMessage = '';
    this.successMessage = '';

    this.offerService.unarchiveOffer(offer).subscribe({
      next: (updatedOffer) => {
        this.offerActionId = null;
        this.offerActionType = null;
        this.upsertOffer(updatedOffer);
        this.successMessage = `L'offre "${updatedOffer.titre}" a ete desarchivee avec succes.`;
      },
      error: (error: { message?: string }) => {
        this.offerActionId = null;
        this.offerActionType = null;
        this.errorMessage = error.message || "Desarchivage de l'offre impossible.";
      }
    });
  }

  deleteOffer(offer: OfferResponse): void {
    if (this.offerActionId !== null) {
      return;
    }

    const confirmed = window.confirm(`Voulez-vous supprimer l'offre "${offer.titre}" ?`);
    if (!confirmed) {
      return;
    }

    this.offerActionId = offer.id;
    this.offerActionType = 'delete';
    this.errorMessage = '';
    this.successMessage = '';

    this.offerService.deleteOffer(offer.id).subscribe({
      next: (response) => {
        this.offerActionId = null;
        this.offerActionType = null;
        this.recruiterOffers = this.recruiterOffers.filter((item) => item.id !== offer.id);
        this.successMessage = response.message || `L'offre "${offer.titre}" a ete supprimee avec succes.`;
      },
      error: (error: { message?: string }) => {
        this.offerActionId = null;
        this.offerActionType = null;
        this.errorMessage = error.message || "Suppression de l'offre impossible.";
      }
    });
  }

  isOfferProcessing(offerId: number, action?: 'archive' | 'unarchive' | 'delete'): boolean {
    if (action) {
      return this.offerActionId === offerId && this.offerActionType === action;
    }

    return this.offerActionId === offerId;
  }

  isOfferArchived(offer: OfferResponse): boolean {
    return this.normalizeOfferStatus(offer.statut) === 'ARCHIVEE';
  }

  getOfferStatusLabel(status: string | null | undefined): string {
    return this.normalizeOfferStatus(status);
  }

  getOfferStatusTone(status: string | null | undefined): 'draft' | 'published' | 'archived' {
    return ({
      BROUILLON: 'draft',
      PUBLIEE: 'published',
      ARCHIVEE: 'archived'
    } as const)[this.normalizeOfferStatus(status)] || 'draft';
  }

  getOfferApplicationsCount(offer: OfferResponse): number {
    if (typeof offer.candidaturesCount === 'number') {
      return offer.candidaturesCount;
    }

    return this.applications.filter((item) => item.offerId === offer.id).length;
  }

  formatOfferDate(value: string | null | undefined): string {
    if (!value) {
      return 'Date non disponible';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(parsed);
  }

  saveCompanyProfile(): void {
    if (this.companySaving) {
      return;
    }

    if (this.companyForm.invalid) {
      this.companyForm.markAllAsTouched();
      this.errorMessage = "Veuillez renseigner correctement les informations de l'entreprise.";
      this.successMessage = '';
      return;
    }

    this.companySaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = this.companyForm.getRawValue() as RecruiterCompanyPayload;

    this.recruiterCompanyService.updateCompanyProfile(payload).subscribe({
      next: (profile) => {
        this.companySaving = false;
        this.companyProfile = profile;
        this.patchCompanyProfile(profile);
        this.successMessage = "Les informations de l'entreprise ont ete enregistrees avec succes.";
      },
      error: (error: { message?: string }) => {
        this.companySaving = false;
        this.errorMessage = error.message || "Mise a jour du profil entreprise impossible.";
      }
    });
  }

  private loadWorkspace(): void {
    this.loading = true;
    this.offersLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.offerService.getRecruiterOffers().subscribe({
      next: (offers) => {
        this.recruiterOffers = offers;
        this.offersLoading = false;
        this.selectedOfferId = this.selectedOfferId && offers.some((item) => item.id === this.selectedOfferId)
          ? this.selectedOfferId
          : (offers[0]?.id ?? null);
        this.loadApplications();
      },
      error: (error: { message?: string }) => {
        this.loading = false;
        this.offersLoading = false;
        this.applicationsLoading = false;
        this.errorMessage = error.message || 'Chargement de l espace recruteur impossible.';
      }
    });
  }

  private loadApplications(): void {
    this.applicationsLoading = true;
    this.applicationService.getRecruiterApplications().subscribe({
      next: (applications) => {
        this.applications = applications;
        this.applicationsLoading = false;
        this.loading = false;
        this.initializePriorityCandidates();
        this.refreshAnalytics();
      },
      error: (error: { message?: string }) => {
        this.applicationsLoading = false;
        this.loading = false;
        this.errorMessage = error.message || 'Chargement des candidatures impossible.';
      }
    });
  }

  private loadCompanyProfile(): void {
    this.companyLoading = true;

    this.recruiterCompanyService.getCompanyProfile().subscribe({
      next: (profile) => {
        this.companyLoading = false;
        this.companyProfile = profile;
        this.patchCompanyProfile(profile);
      },
      error: (error: { message?: string }) => {
        this.companyLoading = false;
        this.errorMessage = error.message || "Chargement du profil entreprise impossible.";
      }
    });
  }

  private patchCompanyProfile(profile: RecruiterCompanyProfile): void {
    this.companyForm.patchValue({
      idEntreprise: profile.idEntreprise,
      nomEntreprise: profile.nomEntreprise || '',
      secteur: profile.secteur || '',
      adresse: profile.adresse || '',
      email: profile.email || '',
      abonnementActif: profile.abonnementActif || 'NON',
      description: profile.description || '',
      siteWeb: profile.siteWeb || ''
    });
  }

  private upsertOffer(offer: OfferResponse): void {
    const existingIndex = this.recruiterOffers.findIndex((item) => item.id === offer.id);
    if (existingIndex === -1) {
      this.recruiterOffers = [offer, ...this.recruiterOffers];
      this.initializePriorityCandidates();
      return;
    }

    this.recruiterOffers = this.recruiterOffers.map((item) => item.id === offer.id ? offer : item);
    this.initializePriorityCandidates();
  }

  onPriorityOfferChange(value: number | string): void {
    const parsed = Number(value);
    this.selectedOfferId = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    this.loadMatchingCandidates();
  }

  onPriorityScoreChange(value: number | string): void {
    const parsed = Number(value);
    this.scoreMinimum = Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 70;
    this.loadMatchingCandidates();
  }

  inviteCandidate(candidate: PriorityCandidateCard): void {
    if (!this.selectedOfferId || candidate.alreadyInvited || candidate.inviting) {
      return;
    }

    candidate.inviting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.offerService.inviteCandidateToOffer(this.selectedOfferId, candidate.candidateId).subscribe({
      next: (response) => {
        candidate.inviting = false;
        candidate.alreadyInvited = true;
        this.successMessage = response.message || 'Invitation envoyee avec succes.';
      },
      error: (error: { message?: string }) => {
        candidate.inviting = false;
        this.errorMessage = error.message || "Envoi de l'invitation impossible.";
      }
    });
  }

  viewCandidateProfile(candidate: PriorityCandidateCard): void {
    this.router.navigate(['/recruiter-candidate-profile', candidate.candidateId], {
      queryParams: this.selectedOfferId ? { offerId: this.selectedOfferId } : undefined
    });
  }

  getMissingSkillsLabel(candidate: PriorityCandidateCard): string[] {
    return candidate.missingSkills?.length ? candidate.missingSkills : ['Aucune competence critique manquante'];
  }

  private initializePriorityCandidates(): void {
    if (!this.selectedOfferId && this.recruiterOffers.length) {
      this.selectedOfferId = this.recruiterOffers[0].id;
    }
    this.loadMatchingCandidates();
  }

  private loadMatchingCandidates(): void {
    if (!this.selectedOfferId) {
      this.priorityCandidates = [];
      return;
    }

    this.matchingCandidatesLoading = true;

    this.offerService.getMatchingCandidates(this.selectedOfferId, this.scoreMinimum).subscribe({
      next: (candidates) => {
        this.matchingCandidatesLoading = false;
        this.priorityCandidates = candidates.map((candidate) => ({ ...candidate, inviting: false }));
        this.refreshInsights();
      },
      error: (error: { message?: string }) => {
        this.matchingCandidatesLoading = false;
        this.priorityCandidates = [];
        this.errorMessage = error.message || 'Chargement des candidats compatibles impossible.';
      }
    });
  }

  private normalizeOfferStatus(status: string | null | undefined): 'BROUILLON' | 'PUBLIEE' | 'ARCHIVEE' {
    const normalized = `${status || ''}`.trim().toUpperCase();
    if (normalized === 'PUBLISHED') {
      return 'PUBLIEE';
    }
    if (normalized === 'ARCHIVED') {
      return 'ARCHIVEE';
    }
    if (normalized === 'DRAFT') {
      return 'BROUILLON';
    }
    if (normalized === 'ARCHIVEE' || normalized === 'PUBLIEE' || normalized === 'BROUILLON') {
      return normalized;
    }

    return 'BROUILLON';
  }

  private refreshAnalytics(): void {
    const palette = this.resolveChartPalette();
    const weeklyBuckets = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const applicationsPerDay = new Array(7).fill(0);

    this.applications.forEach((application) => {
      const date = new Date(application.appliedAt);
      if (Number.isNaN(date.getTime())) {
        return;
      }
      const dayIndex = (date.getDay() + 6) % 7;
      applicationsPerDay[dayIndex] += 1;
    });

    this.weeklyApplicationsChartData = {
      labels: weeklyBuckets,
      datasets: [{
        data: applicationsPerDay,
        label: 'Candidatures',
        backgroundColor: palette.primary,
        borderRadius: 12,
        borderSkipped: false
      }]
    };

    this.pipelineChartData = {
      labels: ['À trier', 'Test IA', 'Entretien', 'Refus', 'Retenu'],
      datasets: [{
        data: [
          this.countStatuses(['APPLIED']),
          this.countStatuses(['AI_TEST_SENT', 'AI_TEST_IN_PROGRESS', 'AI_TEST_COMPLETED']),
          this.countStatuses(['INTERVIEW', 'ENTRETIEN_PLANIFIE', 'ENTRETIEN_EN_COURS']),
          this.countStatuses(['REJECTION_SUGGESTED', 'REJECTED']),
          this.countStatuses(['RETENU'])
        ],
        backgroundColor: [palette.info, palette.primary, palette.success, palette.danger, palette.accent]
      }]
    };

    this.refreshInsights();
  }

  private refreshInsights(): void {
    const insights: RecruiterInsightItem[] = [];
    const topCandidate = [...this.priorityCandidates].sort((left, right) => right.matchingScore - left.matchingScore)[0];
    const averageScore = this.averageMatchingScoreValue;
    const missingSkills = this.priorityCandidates.flatMap((candidate) => candidate.missingSkills || []);
    const topMissingSkill = this.findMostCommon(missingSkills);

    if (topCandidate) {
      insights.push({
        title: 'Candidat prioritaire',
        description: `${topCandidate.fullName} dépasse ${topCandidate.matchingScore}% de compatibilité sur l’offre suivie.`,
        tone: 'success'
      });
    }

    if (topMissingSkill) {
      insights.push({
        title: 'Compétence souvent manquante',
        description: `${topMissingSkill} revient régulièrement parmi les écarts détectés sur vos candidats prioritaires.`,
        tone: 'warning'
      });
    }

    insights.push({
      title: 'Qualité du pipeline',
      description: averageScore >= 75
        ? `Votre score moyen de matching est de ${averageScore}%, ce qui indique un pipeline bien calibré.`
        : `Votre score moyen de matching est de ${averageScore}%. Un meilleur cadrage des compétences obligatoires peut l’améliorer.`,
      tone: averageScore >= 75 ? 'success' : 'primary'
    });

    insights.push({
      title: 'Signal Test IA',
      description: this.countStatuses(['AI_TEST_SENT', 'AI_TEST_IN_PROGRESS']) > 0
        ? `${this.countStatuses(['AI_TEST_SENT', 'AI_TEST_IN_PROGRESS'])} candidature(s) sont actuellement dans une phase Test IA.`
        : 'Aucune candidature n’est actuellement engagée dans un Test IA.',
      tone: this.countStatuses(['AI_TEST_SENT', 'AI_TEST_IN_PROGRESS']) > 0 ? 'warning' : 'neutral'
    });

    this.recruiterInsights = insights.slice(0, 4);
  }

  private countStatuses(statuses: string[]): number {
    return this.applications.filter((application) => statuses.includes(application.status)).length;
  }

  private findMostCommon(items: string[]): string | null {
    if (!items.length) {
      return null;
    }

    const counts = new Map<string, number>();
    items.forEach((item) => counts.set(item, (counts.get(item) || 0) + 1));
    return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] || null;
  }

  private applyChartTheme(): void {
    const palette = this.resolveChartPalette();
    this.lineChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: palette.textMuted } },
        y: { beginAtZero: true, ticks: { color: palette.textMuted, precision: 0 }, grid: { color: palette.grid } }
      }
    };

    this.doughnutOptions = {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: palette.text, usePointStyle: true, padding: 14 }
        }
      }
    };
  }

  private resolveChartPalette(): { primary: string; info: string; success: string; danger: string; accent: string; text: string; textMuted: string; grid: string } {
    const style = getComputedStyle(document.body);
    return {
      primary: '#2563eb',
      info: '#60a5fa',
      success: '#34d399',
      danger: '#f87171',
      accent: '#8b5cf6',
      text: style.getPropertyValue('--sr-text').trim() || '#0f172a',
      textMuted: style.getPropertyValue('--sr-text-muted').trim() || '#64748b',
      grid: 'rgba(148,163,184,0.16)'
    };
  }
}
