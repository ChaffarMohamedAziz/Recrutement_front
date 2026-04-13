import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ApplicationResponse, ApplicationService, AtsStatus } from '../services/application.service';
import { AuthService } from '../services/auth.service';
import { OfferResponse, OfferService } from '../services/offer.service';
import { PageHeroComponent } from '../shared/page-hero/page-hero.component';

interface CandidateStatCard {
  value: string;
  label: string;
  detail: string;
  tone: 'primary' | 'success' | 'warning' | 'neutral';
}

interface CandidateFilterChip {
  label: string;
  value: 'ALL' | AtsStatus;
  count: number;
}

interface CandidateTimelineStep {
  key: 'DEPOT' | 'REVUE' | 'PRESELECTION' | 'ENTRETIEN' | 'DECISION';
  label: string;
}

@Component({
  selector: 'app-candidate-space',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeroComponent],
  templateUrl: './candidate-space.component.html',
  styleUrl: './candidate-space.component.css'
})
export class CandidateSpaceComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly applicationService = inject(ApplicationService);
  private readonly offerService = inject(OfferService);

  readonly user = this.authService.getCurrentUser();
  readonly timelineSteps: CandidateTimelineStep[] = [
    { key: 'DEPOT', label: 'Deposee' },
    { key: 'REVUE', label: 'En revue' },
    { key: 'PRESELECTION', label: 'Preselection' },
    { key: 'ENTRETIEN', label: 'Entretien' },
    { key: 'DECISION', label: 'Decision finale' }
  ];

  applications: ApplicationResponse[] = [];
  recommendedOffers: OfferResponse[] = [];
  loading = false;
  errorMessage = '';
  activeStatusFilter: 'ALL' | AtsStatus = 'ALL';

  readonly quickActions = [
    {
      icon: 'PRO',
      title: 'Mon profil',
      description: 'Mettez a jour vos informations, votre CV et vos competences pour renforcer votre matching.',
      link: '/profile',
      label: 'Ouvrir le profil'
    },
    {
      icon: 'JOB',
      title: 'Explorer les offres',
      description: 'Consultez les nouvelles opportunites et comparez leur niveau de compatibilite.',
      link: '/job-list',
      label: 'Voir les offres'
    },
    {
      icon: 'ATS',
      title: 'Suivre mes candidatures',
      description: 'Gardez une vision claire de chaque etape du processus de recrutement.',
      link: '/candidate-space',
      label: 'Suivre mes dossiers'
    },
    {
      icon: 'MSG',
      title: 'Messagerie',
      description: 'Discutez directement avec les recruteurs a propos de vos candidatures en cours.',
      link: '/messages',
      label: 'Ouvrir la messagerie'
    },
    {
      icon: 'IA',
      title: 'Assistant IA',
      description: 'Demandez des conseils pour renforcer votre profil et mieux cibler vos prochaines offres.',
      link: '/assistant',
      label: 'Parler a l assistant'
    }
  ];

  ngOnInit(): void {
    this.loadCandidateWorkspace();
  }

  get quickStats(): CandidateStatCard[] {
    const interviews = this.applications.filter((item) => item.status === 'ENTRETIEN').length;
    const retained = this.applications.filter((item) => item.status === 'RETENU').length;
    const averageScore = this.applications.length
      ? Math.round(this.applications.reduce((sum, item) => sum + item.score, 0) / this.applications.length)
      : 0;

    return [
      {
        value: String(this.applications.length).padStart(2, '0'),
        label: 'Candidatures',
        detail: 'Dossiers deja envoyes',
        tone: 'primary'
      },
      {
        value: `${averageScore}%`,
        label: 'Score moyen',
        detail: 'Niveau de matching moyen',
        tone: 'neutral'
      },
      {
        value: String(interviews).padStart(2, '0'),
        label: 'Entretiens',
        detail: 'Etapes actuellement en cours',
        tone: 'warning'
      },
      {
        value: String(retained).padStart(2, '0'),
        label: 'Retenus',
        detail: 'Candidatures les plus avancees',
        tone: 'success'
      }
    ];
  }

  get statusFilters(): CandidateFilterChip[] {
    return [
      { label: 'Toutes', value: 'ALL', count: this.applications.length },
      { label: 'A trier', value: 'A_TRIER', count: this.countByStatus('A_TRIER') },
      { label: 'Entretien', value: 'ENTRETIEN', count: this.countByStatus('ENTRETIEN') },
      { label: 'Retenues', value: 'RETENU', count: this.countByStatus('RETENU') },
      { label: 'Refusees', value: 'REFUSE', count: this.countByStatus('REFUSE') }
    ];
  }

  get filteredApplications(): ApplicationResponse[] {
    const scoped = this.activeStatusFilter === 'ALL'
      ? this.applications
      : this.applications.filter((item) => item.status === this.activeStatusFilter);

    return [...scoped].sort(
      (left, right) => new Date(right.appliedAt).getTime() - new Date(left.appliedAt).getTime()
    );
  }

  get featuredApplications(): ApplicationResponse[] {
    return this.filteredApplications.slice(0, 6);
  }

  get recommendedJobs(): OfferResponse[] {
    return [...this.recommendedOffers]
      .filter((item) => !item.alreadyApplied)
      .sort((left, right) => (right.compatibilityScore ?? 0) - (left.compatibilityScore ?? 0))
      .slice(0, 4);
  }

  setStatusFilter(status: 'ALL' | AtsStatus): void {
    this.activeStatusFilter = status;
  }

  getStatusLabel(status: AtsStatus): string {
    switch (status) {
      case 'ENTRETIEN':
        return 'Entretien';
      case 'RETENU':
        return 'Retenu';
      case 'REFUSE':
        return 'Refuse';
      case 'A_TRIER':
      default:
        return 'Deposee';
    }
  }

  getStatusTone(status: AtsStatus): 'neutral' | 'warning' | 'success' | 'danger' {
    switch (status) {
      case 'ENTRETIEN':
        return 'warning';
      case 'RETENU':
        return 'success';
      case 'REFUSE':
        return 'danger';
      case 'A_TRIER':
      default:
        return 'neutral';
    }
  }

  getOfferAdvice(application: ApplicationResponse): string {
    if (application.status === 'RETENU') {
      return 'Votre dossier fait partie des candidatures les plus convaincantes.';
    }

    if (application.status === 'ENTRETIEN') {
      return 'Preparez vos reponses et consultez a nouveau les competences attendues.';
    }

    if (application.status === 'REFUSE') {
      return 'Analysez les competences manquantes pour renforcer vos prochaines candidatures.';
    }

    if (application.score >= 80) {
      return 'Votre matching est solide. Ce dossier merite un suivi prioritaire.';
    }

    return 'Completez votre profil et votre CV pour augmenter votre visibilite.';
  }

  getMatchTone(score: number): 'success' | 'warning' | 'danger' {
    if (score >= 80) {
      return 'success';
    }

    if (score >= 60) {
      return 'warning';
    }

    return 'danger';
  }

  isStepDone(application: ApplicationResponse, stepKey: CandidateTimelineStep['key']): boolean {
    const stageRank = this.getApplicationStageRank(application);
    return stageRank > this.getStepRank(stepKey);
  }

  isStepCurrent(application: ApplicationResponse, stepKey: CandidateTimelineStep['key']): boolean {
    const stageRank = this.getApplicationStageRank(application);
    return stageRank === this.getStepRank(stepKey);
  }

  private getApplicationStageRank(application: ApplicationResponse): number {
    if (application.status === 'ENTRETIEN') {
      return 3;
    }

    if (application.status === 'RETENU' || application.status === 'REFUSE') {
      return 4;
    }

    return 1;
  }

  private getStepRank(stepKey: CandidateTimelineStep['key']): number {
    switch (stepKey) {
      case 'DEPOT':
        return 0;
      case 'REVUE':
        return 1;
      case 'PRESELECTION':
        return 2;
      case 'ENTRETIEN':
        return 3;
      case 'DECISION':
      default:
        return 4;
    }
  }

  private countByStatus(status: AtsStatus): number {
    return this.applications.filter((item) => item.status === status).length;
  }

  private loadCandidateWorkspace(): void {
    this.loading = true;
    this.errorMessage = '';

    this.applicationService.getMyApplications().subscribe({
      next: (applications) => {
        this.applications = applications;
        this.loadRecommendedOffers();
      },
      error: (error: { message?: string }) => {
        this.loading = false;
        this.errorMessage = error.message || 'Chargement de l espace candidat impossible.';
      }
    });
  }

  private loadRecommendedOffers(): void {
    this.offerService.getOffers().subscribe({
      next: (offers) => {
        this.recommendedOffers = offers;
        this.loading = false;
      },
      error: (error: { message?: string }) => {
        this.loading = false;
        this.errorMessage = error.message || 'Chargement des offres recommandees impossible.';
      }
    });
  }
}
