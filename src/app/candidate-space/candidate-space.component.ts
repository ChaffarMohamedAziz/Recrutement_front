import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ApplicationResponse, ApplicationService, AtsStatus } from '../services/application.service';
import { AuthService } from '../services/auth.service';
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
  key: 'DEPOT' | 'TEST_ENVOYE' | 'TEST_TERMINE' | 'ENTRETIEN' | 'DECISION';
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

  readonly user = this.authService.getCurrentUser();
  readonly timelineSteps: CandidateTimelineStep[] = [
    { key: 'DEPOT', label: 'D\u00e9pos\u00e9e' },
    { key: 'TEST_ENVOYE', label: 'Test envoy\u00e9' },
    { key: 'TEST_TERMINE', label: 'Test termin\u00e9' },
    { key: 'ENTRETIEN', label: 'Entretien' },
    { key: 'DECISION', label: 'D\u00e9cision finale' }
  ];

  applications: ApplicationResponse[] = [];
  loading = false;
  errorMessage = '';
  activeStatusFilter: 'ALL' | AtsStatus = 'ALL';

  ngOnInit(): void {
    this.loadCandidateWorkspace();
  }

  get quickStats(): CandidateStatCard[] {
    const interviewsToPlan = this.applications.filter((item) =>
      ['INTERVIEW', 'ENTRETIEN_PLANIFIE'].includes(item.status)
    ).length;
    const pendingAiTests = this.applications.filter((item) =>
      ['AI_TEST_SENT', 'AI_TEST_IN_PROGRESS'].includes(item.status)
      || this.normalizeAiTestStatus(item.aiTestStatus) === 'NOT_STARTED'
    ).length;
    const rejectedCount = this.countByStatus('REJECTED');
    const retainedCount = this.countByStatus('RETENU');

    return [
      {
        value: String(this.applications.length).padStart(2, '0'),
        label: 'Candidatures',
        detail: 'Dossiers d\u00e9j\u00e0 envoy\u00e9s',
        tone: 'primary'
      },
      {
        value: String(pendingAiTests).padStart(2, '0'),
        label: 'Tests IA a passer',
        detail: 'Evaluations a traiter',
        tone: pendingAiTests ? 'warning' : 'neutral'
      },
      {
        value: String(interviewsToPlan).padStart(2, '0'),
        label: 'Entretiens a planifier',
        detail: 'Etapes a organiser avec les recruteurs',
        tone: interviewsToPlan ? 'success' : 'neutral'
      },
      {
        value: String(rejectedCount + retainedCount).padStart(2, '0'),
        label: 'Refusees / retenues',
        detail: `${rejectedCount} refusee(s) · ${retainedCount} retenue(s)`,
        tone: retainedCount > 0 ? 'success' : 'neutral'
      }
    ];
  }

  get statusFilters(): CandidateFilterChip[] {
    return [
      { label: 'Toutes', value: 'ALL', count: this.applications.length },
      { label: 'Re\u00e7ues', value: 'APPLIED', count: this.countByStatus('APPLIED') },
      {
        label: 'Test IA envoy\u00e9',
        value: 'AI_TEST_SENT',
        count: this.countByStatuses(['AI_TEST_SENT', 'AI_TEST_IN_PROGRESS'])
      },
      { label: 'Entretien \u00e0 planifier', value: 'INTERVIEW', count: this.countByStatus('INTERVIEW') },
      { label: 'Entretien planifi\u00e9', value: 'ENTRETIEN_PLANIFIE', count: this.countByStatus('ENTRETIEN_PLANIFIE') },
      { label: 'Entretien en cours', value: 'ENTRETIEN_EN_COURS', count: this.countByStatus('ENTRETIEN_EN_COURS') },
      { label: 'Absence \u00e0 v\u00e9rifier', value: 'ABSENCE_A_VERIFIER', count: this.countByStatus('ABSENCE_A_VERIFIER') },
      { label: 'R\u00e9sultat en revue', value: 'REJECTION_SUGGESTED', count: this.countByStatus('REJECTION_SUGGESTED') },
      { label: 'Refus\u00e9es', value: 'REJECTED', count: this.countByStatus('REJECTED') }
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

  setStatusFilter(status: 'ALL' | AtsStatus): void {
    this.activeStatusFilter = status;
  }

  getStatusLabel(status: AtsStatus): string {
    switch (status) {
      case 'AI_TEST_IN_PROGRESS':
        return 'Test IA en cours';
      case 'AI_TEST_SENT':
        return 'Test IA envoy\u00e9';
      case 'AI_TEST_COMPLETED':
        return 'Test termin\u00e9';
      case 'INTERVIEW':
        return 'Entretien \u00e0 planifier';
      case 'ENTRETIEN_PLANIFIE':
        return 'Entretien planifi\u00e9';
      case 'ENTRETIEN_EN_COURS':
        return 'Entretien en cours';
      case 'ABSENCE_A_VERIFIER':
        return 'Absence \u00e0 v\u00e9rifier';
      case 'REJECTION_SUGGESTED':
        return 'R\u00e9sultat en revue';
      case 'REJECTED':
        return 'Refus\u00e9';
      case 'RETENU':
        return 'Retenu';
      default:
        return 'D\u00e9pos\u00e9e';
    }
  }

  getStatusTone(status: AtsStatus): 'neutral' | 'warning' | 'success' | 'danger' {
    switch (status) {
      case 'AI_TEST_IN_PROGRESS':
      case 'AI_TEST_SENT':
      case 'AI_TEST_COMPLETED':
      case 'REJECTION_SUGGESTED':
      case 'ABSENCE_A_VERIFIER':
        return 'warning';
      case 'INTERVIEW':
      case 'ENTRETIEN_PLANIFIE':
      case 'ENTRETIEN_EN_COURS':
      case 'RETENU':
        return 'success';
      case 'REJECTED':
        return 'danger';
      default:
        return 'neutral';
    }
  }

  getOfferAdvice(application: ApplicationResponse): string {
    if (
      application.aiTestId
      && this.normalizeAiTestStatus(application.aiTestStatus) === 'NOT_STARTED'
      && application.status === 'APPLIED'
    ) {
      return 'Un test IA valid\u00e9 est disponible pour cette offre. Vous pouvez le d\u00e9marrer d\u00e8s maintenant.';
    }

    if ((application.status === 'AI_TEST_SENT' || application.status === 'AI_TEST_IN_PROGRESS') && application.aiTestId) {
      return 'Un test IA vous attend. Passez-le rapidement pour d\u00e9bloquer la suite du processus.';
    }

    if (application.status === 'INTERVIEW') {
      return 'Le recruteur a valid\u00e9 la suite. L\u2019\u00e9tape suivante consiste \u00e0 planifier votre entretien.';
    }

    if (application.status === 'ENTRETIEN_PLANIFIE') {
      return 'Votre entretien est planifi\u00e9. V\u00e9rifiez l\u2019horaire, le mode et le lien ou le lieu du rendez-vous.';
    }

    if (application.status === 'ENTRETIEN_EN_COURS') {
      return 'Votre entretien est en cours ou d\u00e9marre tr\u00e8s bient\u00f4t. Restez joignable et pr\u00e9parez vos exemples concrets.';
    }

    if (application.status === 'ABSENCE_A_VERIFIER') {
      return 'Le recruteur doit encore v\u00e9rifier votre pr\u00e9sence. Si besoin, contactez-le rapidement via la messagerie.';
    }

    if (application.status === 'REJECTION_SUGGESTED') {
      return 'Votre test a \u00e9t\u00e9 corrig\u00e9. Le recruteur examine maintenant la recommandation du syst\u00e8me.';
    }

    if (application.status === 'REJECTED') {
      return 'Analysez les comp\u00e9tences manquantes pour renforcer vos prochaines candidatures.';
    }

    if (application.score >= 80) {
      return 'Votre matching est solide. Ce dossier m\u00e9rite un suivi prioritaire.';
    }

    return 'Compl\u00e9tez votre profil et votre CV pour augmenter votre visibilit\u00e9.';
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

  hasAvailableAiTest(application: ApplicationResponse): boolean {
    const aiStatus = this.normalizeAiTestStatus(application.aiTestStatus);
    return !!application.id && (
      !!application.canPassAiTest
      || !!application.aiTestAvailable
      || ['NOT_STARTED', 'IN_PROGRESS', 'VALIDATED', 'PUBLISHED'].includes(aiStatus)
    );
  }

  getApplicationAiTestActionLabel(application: ApplicationResponse): string {
    const aiStatus = this.normalizeAiTestStatus(application.aiTestStatus);
    return aiStatus === 'IN_PROGRESS' || application.status === 'AI_TEST_IN_PROGRESS'
      ? 'Continuer le Test IA'
      : 'Passer le Test IA';
  }

  isAiTestCompleted(application: ApplicationResponse): boolean {
    const aiStatus = this.normalizeAiTestStatus(application.aiTestStatus);
    return !!application.id && ['SUBMITTED', 'EXPIRED', 'CHEATING_SUSPECTED', 'CLOSED'].includes(aiStatus);
  }

  private getApplicationStageRank(application: ApplicationResponse): number {
    if (application.status === 'AI_TEST_SENT' || application.status === 'AI_TEST_IN_PROGRESS') {
      return 1;
    }

    if (application.status === 'AI_TEST_COMPLETED' || application.status === 'REJECTION_SUGGESTED') {
      return 2;
    }

    if (
      application.status === 'INTERVIEW'
      || application.status === 'ENTRETIEN_PLANIFIE'
      || application.status === 'ENTRETIEN_EN_COURS'
      || application.status === 'ABSENCE_A_VERIFIER'
    ) {
      return 3;
    }

    if (application.status === 'RETENU' || application.status === 'REJECTED') {
      return 4;
    }

    return 0;
  }

  private getStepRank(stepKey: CandidateTimelineStep['key']): number {
    switch (stepKey) {
      case 'DEPOT':
        return 0;
      case 'TEST_ENVOYE':
        return 1;
      case 'TEST_TERMINE':
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

  private countByStatuses(statuses: AtsStatus[]): number {
    return this.applications.filter((item) => statuses.includes(item.status)).length;
  }

  private loadCandidateWorkspace(): void {
    this.loading = true;
    this.errorMessage = '';

    this.applicationService.getMyApplications().subscribe({
      next: (applications) => {
        this.applications = applications;
        this.loading = false;
      },
      error: (error: { message?: string }) => {
        this.loading = false;
        this.errorMessage = error.message || 'Chargement de l espace candidat impossible.';
      }
    });
  }

  private normalizeAiTestStatus(status: string | null | undefined): string {
    return (status || '').trim().toUpperCase();
  }
}
