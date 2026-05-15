import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AiTestService } from '../services/ai-test.service';
import { ApplicationResponse, ApplicationService, AtsStatus } from '../services/application.service';
import { AuthService, AuthUser } from '../services/auth.service';
import {
  InterviewPlannerDraftResponse,
  InterviewResponse,
  InterviewService,
  ScheduleInterviewPayload
} from '../services/interview.service';
import { OfferResponse, OfferService } from '../services/offer.service';

interface AtsColumn {
  key: AtsStatus;
  title: string;
  accent: string;
  eyebrow: string;
  description: string;
}

interface StatusOption {
  value: AtsStatus;
  label: string;
  apiStatus: string;
}

interface OverviewMetric {
  label: string;
  value: number;
  detail: string;
  accent: string;
  marker: string;
}

interface InterviewPlannerForm {
  interviewType: 'RH' | 'TECHNIQUE' | 'FINAL';
  mode: 'EN_LIGNE' | 'PRESENTIEL' | 'TELEPHONE';
  date: string;
  startTime: string;
  durationMinutes: number;
  meetingLink: string;
  location: string;
  invitationMessage: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  user: AuthUser | null;
  minScore = 0;
  interviewThreshold = 70;
  draggedCandidateId: number | null = null;
  applications: ApplicationResponse[] = [];
  recruiterOffers: OfferResponse[] = [];
  selectedOfferId: number | null = null;
  loading = false;
  errorMessage = '';
  successMessage = '';
  sendingAiTestId: number | null = null;
  pendingPlannerApplicationId: number | null = null;

  plannerOpen = false;
  plannerLoading = false;
  plannerSaving = false;
  plannerMode: 'create' | 'reschedule' = 'create';
  plannerDraft: InterviewPlannerDraftResponse | null = null;
  plannerApplication: ApplicationResponse | null = null;
  plannerSuggestedQuestions: string[] = [];
  plannerForm: InterviewPlannerForm = this.createDefaultPlannerForm();
  plannerMessageManuallyEdited = false;
  plannerValidationAttempted = false;

  readonly columns: AtsColumn[] = [
    {
      key: 'APPLIED',
      title: 'À trier',
      accent: 'blue',
      eyebrow: 'Réception',
      description: 'Nouvelles candidatures à qualifier et prioriser.'
    },
    {
      key: 'AI_TEST_SENT',
      title: 'Test IA envoyé',
      accent: 'violet',
      eyebrow: 'Évaluation',
      description: 'Tests envoyés en attente de complétion ou de retour.'
    },
    {
      key: 'INTERVIEW',
      title: 'Entretien à planifier',
      accent: 'cyan',
      eyebrow: 'Préparation',
      description: 'Profils validés prêts pour la prochaine étape.'
    },
    {
      key: 'ENTRETIEN_PLANIFIE',
      title: 'Entretien planifié',
      accent: 'teal',
      eyebrow: 'Agenda',
      description: 'Entretiens confirmés avec date, mode et rappel.'
    },
    {
      key: 'ENTRETIEN_EN_COURS',
      title: 'Entretien en cours',
      accent: 'green',
      eyebrow: 'Live',
      description: 'Entretiens ouverts avec présence à confirmer.'
    },
    {
      key: 'ABSENCE_A_VERIFIER',
      title: 'Absence à vérifier',
      accent: 'amber',
      eyebrow: 'Suivi',
      description: 'Candidats non présents en attente de vérification.'
    },
    {
      key: 'REJECTION_SUGGESTED',
      title: 'Refus proposé',
      accent: 'orange',
      eyebrow: 'Décision',
      description: 'Refus suggérés après évaluation à valider humainement.'
    },
    {
      key: 'REJECTED',
      title: 'Refusé',
      accent: 'red',
      eyebrow: 'Clôture',
      description: 'Candidatures clôturées et sorties du processus.'
    },
    {
      key: 'RETENU',
      title: 'Retenu',
      accent: 'green',
      eyebrow: 'Sélection',
      description: 'Candidats retenus pour la suite finale ou une proposition.'
    }
  ];

  readonly statusOptions: StatusOption[] = [
    { value: 'APPLIED', label: 'À trier', apiStatus: 'A_TRIER' },
    { value: 'AI_TEST_SENT', label: 'Test IA envoyé', apiStatus: 'AI_TEST_SENT' },
    { value: 'INTERVIEW', label: 'Entretien à planifier', apiStatus: 'AI_TEST_COMPLETED' },
    { value: 'ENTRETIEN_PLANIFIE', label: 'Entretien planifié', apiStatus: 'ENTRETIEN_PLANIFIE' },
    { value: 'ENTRETIEN_EN_COURS', label: 'Entretien en cours', apiStatus: 'ENTRETIEN_EN_COURS' },
    { value: 'ABSENCE_A_VERIFIER', label: 'Absence à vérifier', apiStatus: 'ABSENCE_A_VERIFIER' },
    { value: 'REJECTION_SUGGESTED', label: 'Refus proposé', apiStatus: 'REFUS_PROPOSE' },
    { value: 'REJECTED', label: 'Refusé', apiStatus: 'REFUSE' },
    { value: 'RETENU', label: 'Retenu', apiStatus: 'RETENU' }
  ];

  constructor(
    private readonly authService: AuthService,
    private readonly applicationService: ApplicationService,
    private readonly aiTestService: AiTestService,
    private readonly interviewService: InterviewService,
    private readonly offerService: OfferService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {
    this.user = this.authService.getCurrentUser();

    if (!this.user) {
      this.router.navigate(['/login']);
    }
  }

  ngOnInit(): void {
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }));
    this.route.queryParamMap.subscribe((params) => {
      const rawValue = params.get('planInterviewFor');
      const parsedValue = rawValue ? Number(rawValue) : null;
      this.pendingPlannerApplicationId = parsedValue && Number.isFinite(parsedValue) ? parsedValue : null;

      if (this.pendingPlannerApplicationId && this.applications.length) {
        this.tryOpenPendingPlanner();
      }
    });
    this.loadRecruiterOffers();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.plannerOpen && !this.plannerSaving) {
      this.closeInterviewPlanner();
    }
  }

  get filteredApplications(): ApplicationResponse[] {
    return this.applications.filter((candidate) => this.getApplicationScore(candidate) >= this.minScore);
  }

  get totalVisibleCandidates(): number {
    return this.filteredApplications.length;
  }

  get averageVisibleScore(): number {
    if (!this.filteredApplications.length) {
      return 0;
    }

    const total = this.filteredApplications.reduce((sum, candidate) => sum + this.getApplicationScore(candidate), 0);
    return Math.round(total / this.filteredApplications.length);
  }

  get currentOfferTitle(): string {
    if (!this.selectedOfferId) {
      return 'Toutes les offres';
    }

    return this.recruiterOffers.find((item) => item.id === this.selectedOfferId)?.titre || 'Offre sélectionnée';
  }

  get hasActiveFilters(): boolean {
    return !!this.selectedOfferId || this.minScore > 0;
  }

  get plannerTitle(): string {
    return this.plannerMode === 'reschedule' ? "Replanifier l'entretien" : 'Smart Interview Planner';
  }

  get plannerPrimaryActionLabel(): string {
    if (this.plannerSaving) {
      return this.plannerMode === 'reschedule' ? 'Replanification...' : 'Planification...';
    }

    return this.plannerMode === 'reschedule' ? 'Confirmer la replanification' : "Confirmer l'entretien";
  }

  get plannerRecommendationLabel(): string {
    const recommendation = (this.plannerDraft?.aiRecommendation || this.plannerApplication?.aiTestRecommendation || '').toUpperCase();

    if (recommendation === 'INTERVIEW') {
      return 'Entretien recommandé';
    }

    if (recommendation === 'REJECTION_SUGGESTED') {
      return "Refus proposé par l'IA";
    }

    return 'Aucune recommandation critique';
  }

  get plannerAiScoreLabel(): string {
    const score = this.plannerDraft?.aiTestScore ?? this.plannerApplication?.aiTestScore;
    return score === null || score === undefined ? 'Non disponible' : `${score}%`;
  }

  get plannerFormValid(): boolean {
    if (
      !this.plannerForm.interviewType
      || !this.plannerForm.mode
      || !this.plannerForm.date
      || !this.plannerForm.startTime
      || !this.plannerForm.durationMinutes
      || this.plannerForm.durationMinutes < 15
      || !this.plannerForm.invitationMessage.trim()
    ) {
      return false;
    }

    if (this.plannerForm.mode === 'EN_LIGNE') {
      return !!this.plannerForm.meetingLink.trim();
    }

    if (this.plannerForm.mode === 'PRESENTIEL') {
      return !!this.plannerForm.location.trim();
    }

    return true;
  }

  get plannerValidationErrors(): string[] {
    const errors: string[] = [];

    if (!this.plannerForm.interviewType) {
      errors.push("Le type d’entretien est obligatoire.");
    }
    if (!this.plannerForm.mode) {
      errors.push('Le mode est obligatoire.');
    }
    if (!this.plannerForm.date) {
      errors.push('La date est obligatoire.');
    }
    if (!this.plannerForm.startTime) {
      errors.push("L'heure début est obligatoire.");
    }
    if (!this.plannerForm.durationMinutes || this.plannerForm.durationMinutes < 15) {
      errors.push('La durée doit être renseignée et supérieure ou égale à 15 minutes.');
    }
    if (this.plannerForm.mode === 'EN_LIGNE' && !this.plannerForm.meetingLink.trim()) {
      errors.push('Le lien de réunion est obligatoire pour un entretien en ligne.');
    }
    if (this.plannerForm.mode === 'PRESENTIEL' && !this.plannerForm.location.trim()) {
      errors.push('L’adresse est obligatoire pour un entretien présentiel.');
    }
    if (!this.plannerForm.invitationMessage.trim()) {
      errors.push("Le message d’invitation ne peut pas être vide.");
    }

    return errors;
  }

  get overviewMetrics(): OverviewMetric[] {
    const total = this.totalVisibleCandidates;
    const sent = this.countByStatuses(['AI_TEST_SENT']);
    const planned = this.countByStatuses(['ENTRETIEN_PLANIFIE', 'ENTRETIEN_EN_COURS']);
    const suggested = this.countByStatuses(['REJECTION_SUGGESTED']);
    const rejected = this.countByStatuses(['REJECTED']);
    const retained = this.countByStatuses(['RETENU']);

    return [
      {
        label: 'Total candidatures',
        value: total,
        detail: total ? `${this.averageVisibleScore}% de score moyen` : 'Aucun profil en cours',
        accent: 'blue',
        marker: 'ATS'
      },
      {
        label: 'Tests IA envoyés',
        value: sent,
        detail: this.formatShare(sent, total),
        accent: 'violet',
        marker: 'IA'
      },
      {
        label: 'Entretiens planifiés',
        value: planned,
        detail: this.formatShare(planned, total),
        accent: 'teal',
        marker: 'RDV'
      },
      {
        label: 'Refus proposés',
        value: suggested,
        detail: this.formatShare(suggested, total),
        accent: 'orange',
        marker: 'AL'
      },
      {
        label: 'Refusés',
        value: rejected,
        detail: this.formatShare(rejected, total),
        accent: 'red',
        marker: 'NO'
      },
      {
        label: 'Retenus',
        value: retained,
        detail: this.formatShare(retained, total),
        accent: 'green',
        marker: 'OK'
      }
    ];
  }

  getColumnApplications(status: AtsStatus): ApplicationResponse[] {
    return this.filteredApplications.filter((candidate) => this.getDisplayColumnStatus(candidate) === status);
  }

  getColumnCount(status: AtsStatus): number {
    return this.getColumnApplications(status).length;
  }

  setMinScore(event: Event): void {
    this.minScore = Number((event.target as HTMLInputElement).value);
  }

  onOfferFilterChange(): void {
    this.loadApplications();
  }

  resetFilters(): void {
    this.selectedOfferId = null;
    this.minScore = 0;
    this.loadApplications();
  }

  setInterviewThreshold(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.interviewThreshold = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 70;
  }

  stopCardAction(event: Event): void {
    event.stopPropagation();
  }

  onDragStart(event: DragEvent, candidateId: number): void {
    this.draggedCandidateId = candidateId;
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', String(candidateId));
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDragEnd(): void {
    this.draggedCandidateId = null;
  }

  allowDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDrop(event: DragEvent, status: AtsStatus): void {
    event.preventDefault();
    if (!this.canDropToStatus(status)) {
      this.draggedCandidateId = null;
      return;
    }

    const draggedId = this.draggedCandidateId ?? Number(event.dataTransfer?.getData('text/plain'));
    if (!Number.isFinite(draggedId)) {
      this.draggedCandidateId = null;
      return;
    }

    const candidate = this.applications.find((item) => item.id === draggedId);
    if (!candidate || this.getDisplayColumnStatus(candidate) === status) {
      this.draggedCandidateId = null;
      return;
    }

    this.moveApplicationToStatus(candidate, status, candidate.status);
  }

  onStatusSelect(application: ApplicationResponse, event: Event): void {
    const targetStatus = (event.target as HTMLSelectElement).value as AtsStatus;
    if (this.getDisplayColumnStatus(application) === targetStatus) {
      return;
    }

    this.moveApplicationToStatus(application, targetStatus, application.status);
  }

  getSelectedStatus(application: ApplicationResponse): AtsStatus {
    return this.getDisplayColumnStatus(application);
  }

  private moveApplicationToStatus(
    application: ApplicationResponse,
    targetStatus: AtsStatus,
    previousStatus: AtsStatus | null
  ): void {
    application.status = targetStatus;
    this.draggedCandidateId = null;
    this.errorMessage = '';

    this.applicationService.updateRecruiterApplicationStatus(
      application.id,
      this.mapStatusToApiStatus(targetStatus)
    ).subscribe({
      next: (updated) => {
        this.applications = this.applications.map((item) => item.id === updated.id ? updated : item);
        this.successMessage = 'Le statut de la candidature a ete mis a jour.';
      },
      error: (error: { message?: string }) => {
        if (previousStatus) {
          application.status = previousStatus;
        }
        this.errorMessage = error.message || 'Mise a jour du pipeline impossible.';
      }
    });
  }

  sendAiTest(application: ApplicationResponse): void {
    if (!application.id || this.sendingAiTestId === application.id) {
      return;
    }

    this.sendingAiTestId = application.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.aiTestService.createRecruiterAiTest(application.id, {
      threshold: this.interviewThreshold
    }).subscribe({
      next: (test) => {
        this.sendingAiTestId = null;
        this.applications = this.applications.map((item) => item.id === application.id ? {
          ...item,
          status: 'AI_TEST_SENT',
          aiTestId: test.id,
          aiTestStatus: test.status,
          aiTestThreshold: test.threshold,
          aiTestScore: test.score,
          aiTestRecommendation: test.recommendation,
          aiTestDurationMinutes: test.durationMinutes,
          aiTestStartedAt: test.startedAt,
          aiTestExpiresAt: test.expiresAt,
          aiTestSubmittedAt: test.submittedAt,
          aiTestCompletedAt: test.completedAt,
          aiTestClosedReason: test.closedReason,
          aiTestCheatingSuspicion: test.cheatingSuspicion,
          aiTestTabSwitchCount: test.tabSwitchCount,
          aiTestWarningCount: test.warningCount
        } : item);
        this.successMessage = `Le test IA a ete envoye a ${application.candidateName}.`;
      },
      error: (error: { message?: string }) => {
        this.sendingAiTestId = null;
        this.errorMessage = error.message || 'Envoi du test IA impossible.';
      }
    });
  }

  openAiReport(application: ApplicationResponse): void {
    this.router.navigate(['/candidate-details', application.id], { queryParams: { tab: 'ai-test' } });
  }

  openInterviewPlanner(application: ApplicationResponse, mode: 'create' | 'reschedule' = 'create'): void {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });

    this.plannerOpen = true;
    this.plannerLoading = true;
    this.plannerMode = mode;
    this.plannerApplication = application;
    this.plannerDraft = null;
    this.plannerSuggestedQuestions = [];
    this.plannerForm = this.createDefaultPlannerForm();
    this.plannerMessageManuallyEdited = false;
    this.plannerValidationAttempted = false;

    if (mode === 'reschedule') {
      this.patchPlannerFromApplication(application);
    }

    this.interviewService.getPlannerDraft(application.id).subscribe({
      next: (draft) => {
        this.plannerLoading = false;
        this.plannerDraft = draft;
        this.plannerSuggestedQuestions = draft.suggestedQuestions?.length
          ? draft.suggestedQuestions
          : this.buildFallbackInterviewQuestions(application);
        this.plannerForm.interviewType = (draft.suggestedInterviewType as InterviewPlannerForm['interviewType']) || this.plannerForm.interviewType;
        this.updateInvitationMessage(true, draft.defaultInvitationMessage || undefined);
      },
      error: (error: { message?: string }) => {
        this.plannerLoading = false;
        this.plannerSuggestedQuestions = this.buildFallbackInterviewQuestions(application);
        this.updateInvitationMessage(true);
        this.errorMessage = error.message || "Chargement de la préparation IA impossible. Vous pouvez tout de même planifier l'entretien.";
      }
    });
  }

  closeInterviewPlanner(): void {
    this.plannerOpen = false;
    this.plannerLoading = false;
    this.plannerSaving = false;
    this.plannerMode = 'create';
    this.plannerDraft = null;
    this.plannerApplication = null;
    this.plannerSuggestedQuestions = [];
    this.plannerForm = this.createDefaultPlannerForm();
    this.plannerMessageManuallyEdited = false;
    this.plannerValidationAttempted = false;
  }

  submitInterviewPlanner(): void {
    if (!this.plannerApplication || this.plannerSaving) {
      return;
    }

    this.plannerValidationAttempted = true;
    if (!this.plannerFormValid) {
      this.errorMessage = "Merci de compléter les informations obligatoires de l'entretien.";
      return;
    }

    this.plannerSaving = true;
    this.errorMessage = '';
    this.successMessage = '';
    const payload = this.toInterviewPayload();

    const request$ = this.plannerMode === 'reschedule' && this.plannerApplication.interviewId
      ? this.interviewService.rescheduleInterview(this.plannerApplication.interviewId, payload)
      : this.interviewService.scheduleInterview(this.plannerApplication.id, payload);

    request$.subscribe({
      next: (interview) => {
        const applicationId = this.plannerApplication?.id;
        this.plannerSaving = false;

        if (applicationId) {
          this.syncApplicationInterview(applicationId, interview, 'ENTRETIEN_PLANIFIE');
        }

        const successMessage = this.plannerMode === 'reschedule'
          ? "L'entretien a ete replanifie avec succes."
          : "L'entretien a ete planifie avec succes.";

        this.closeInterviewPlanner();
        this.successMessage = successMessage;
      },
      error: (error: { message?: string }) => {
        this.plannerSaving = false;
        this.errorMessage = error.message || "Planification de l'entretien impossible.";
      }
    });
  }

  markCandidatePresent(application: ApplicationResponse): void {
    if (!application.interviewId) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    this.interviewService.markPresent(application.interviewId).subscribe({
      next: (interview) => {
        this.syncApplicationInterview(application.id, interview, 'ENTRETIEN_EN_COURS');
        this.successMessage = 'Le candidat a ete marque present.';
      },
      error: (error: { message?: string }) => {
        this.errorMessage = error.message || 'Mise a jour de la presence impossible.';
      }
    });
  }

  confirmCandidateAbsence(application: ApplicationResponse): void {
    if (!application.interviewId) {
      return;
    }

    const confirmed = window.confirm("Confirmer l'absence du candidat et envoyer l'email de refus ?");
    if (!confirmed) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    this.interviewService.confirmAbsence(application.interviewId, {}).subscribe({
      next: (response) => {
        this.applications = this.applications.map((item) => item.id === application.id ? {
          ...item,
          status: 'REJECTED',
          interviewAttendanceStatus: 'ABSENT_CONFIRMED',
          interviewStatus: 'CANCELLED'
        } : item);
        this.successMessage = response.message || "L'absence a ete confirmee.";
      },
      error: (error: { message?: string }) => {
        this.errorMessage = error.message || "Confirmation de l'absence impossible.";
      }
    });
  }

  confirmAiRejection(application: ApplicationResponse): void {
    if (!application.aiTestId) {
      return;
    }

    const emailBody = window.prompt(
      "Validez ou ajustez l'email de refus avant l'envoi.",
      this.buildDefaultRejectionEmail(application)
    );

    if (emailBody === null) {
      return;
    }

    const trimmedBody = emailBody.trim();
    if (!trimmedBody) {
      this.errorMessage = "L'email de refus ne peut pas etre vide.";
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    this.aiTestService.rejectAfterAiTest(application.id, { emailBody: trimmedBody }).subscribe({
      next: (response) => {
        this.applications = this.applications.map((item) => item.id === application.id ? {
          ...item,
          status: 'REJECTED'
        } : item);
        this.successMessage = response.message || 'Le refus a ete confirme et envoye au candidat.';
      },
      error: (error: { message?: string }) => {
        this.errorMessage = error.message || 'Confirmation du refus impossible.';
      }
    });
  }

  reopenAiTest(application: ApplicationResponse): void {
    if (!application.aiTestId) {
      return;
    }

    const confirmed = window.confirm("Reouvrir ce test IA et replacer la candidature dans l'etape Test IA envoye ?");
    if (!confirmed) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    this.aiTestService.reopenRecruiterAiTest(application.aiTestId).subscribe({
      next: (test) => {
        this.applications = this.applications.map((item) => item.id === application.id ? {
          ...item,
          status: 'AI_TEST_SENT',
          aiTestStatus: test.status,
          aiTestThreshold: test.threshold,
          aiTestScore: test.score,
          aiTestRecommendation: test.recommendation,
          aiTestDurationMinutes: test.durationMinutes,
          aiTestStartedAt: test.startedAt,
          aiTestExpiresAt: test.expiresAt,
          aiTestSubmittedAt: test.submittedAt,
          aiTestCompletedAt: test.completedAt,
          aiTestClosedReason: test.closedReason,
          aiTestCheatingSuspicion: test.cheatingSuspicion,
          aiTestTabSwitchCount: test.tabSwitchCount,
          aiTestWarningCount: test.warningCount
        } : item);
        this.successMessage = `Le test IA de ${application.candidateName} a ete reouvert.`;
      },
      error: (error: { message?: string }) => {
        this.errorMessage = error.message || 'Reouverture du test IA impossible.';
      }
    });
  }

  canSendAiTest(application: ApplicationResponse): boolean {
    return application.status === 'APPLIED' && !application.aiTestId;
  }

  canConfirmAiRejection(application: ApplicationResponse): boolean {
    return application.status === 'REJECTION_SUGGESTED' && !!application.aiTestId;
  }

  canReopenAiTest(application: ApplicationResponse): boolean {
    if (!application.aiTestId) {
      return false;
    }

    const normalizedAiTestStatus = this.normalizeAiTestStatus(application.aiTestStatus);
    return normalizedAiTestStatus === 'CHEATING_SUSPECTED'
      || normalizedAiTestStatus === 'EXPIRED'
      || normalizedAiTestStatus === 'CLOSED';
  }

  canPlanInterview(application: ApplicationResponse): boolean {
    return this.getDisplayColumnStatus(application) === 'INTERVIEW';
  }

  canRescheduleInterview(application: ApplicationResponse): boolean {
    return !!application.interviewId && (
      application.status === 'ENTRETIEN_PLANIFIE'
      || application.status === 'ENTRETIEN_EN_COURS'
      || application.status === 'ABSENCE_A_VERIFIER'
    );
  }

  canMarkPresent(application: ApplicationResponse): boolean {
    return !!application.interviewId && (
      application.status === 'ENTRETIEN_PLANIFIE'
      || application.status === 'ENTRETIEN_EN_COURS'
      || application.status === 'ABSENCE_A_VERIFIER'
    );
  }

  canConfirmAbsence(application: ApplicationResponse): boolean {
    return !!application.interviewId && (
      application.status === 'ABSENCE_A_VERIFIER'
      || application.status === 'ENTRETIEN_EN_COURS'
      || application.status === 'ENTRETIEN_PLANIFIE'
    );
  }

  canDropToStatus(status: AtsStatus): boolean {
    return this.statusOptions.some((option) => option.value === status);
  }

  getMatchRatio(candidate: ApplicationResponse): number {
    if (!candidate.skills.length) {
      return 0;
    }

    const matches = candidate.skills.filter((skill) => skill.matched).length;
    return Math.round((matches / candidate.skills.length) * 100);
  }

  getCandidateInitials(candidate: ApplicationResponse): string {
    return candidate.candidateName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((item) => item.charAt(0).toUpperCase())
      .join('');
  }

  getScoreTone(score: number): 'success' | 'warning' | 'danger' {
    if (score >= 80) {
      return 'success';
    }

    if (score >= 60) {
      return 'warning';
    }

    return 'danger';
  }

  getDisplayScore(candidate: ApplicationResponse): number {
    return this.getApplicationScore(candidate);
  }

  getStatusLabel(status: AtsStatus): string {
    switch (status) {
      case 'AI_TEST_SENT':
        return 'Test IA envoyé';
      case 'AI_TEST_COMPLETED':
        return 'Test terminé';
      case 'INTERVIEW':
        return 'Entretien à planifier';
      case 'ENTRETIEN_PLANIFIE':
        return 'Entretien planifié';
      case 'ENTRETIEN_EN_COURS':
        return 'Entretien en cours';
      case 'ABSENCE_A_VERIFIER':
        return 'Absence à vérifier';
      case 'REJECTION_SUGGESTED':
        return 'Refus proposé';
      case 'REJECTED':
        return 'Refusé';
      case 'RETENU':
        return 'Retenu';
      default:
        return 'À trier';
    }
  }

  getAiBadgeLabel(application: ApplicationResponse): string {
    if (application.status === 'INTERVIEW' && application.aiTestId) {
      return `Test réussi${application.aiTestScore !== null ? ` · ${application.aiTestScore}%` : ''}`;
    }

    if (application.status === 'REJECTION_SUGGESTED') {
      return `Refus proposé${application.aiTestScore !== null ? ` · ${application.aiTestScore}%` : ''}`;
    }

    if (application.status === 'AI_TEST_SENT') {
      return 'Test en attente';
    }

    return '';
  }

  getAiBadgeTone(application: ApplicationResponse): 'neutral' | 'success' | 'warning' | 'danger' {
    if (application.status === 'INTERVIEW') {
      return 'success';
    }

    if (application.status === 'REJECTION_SUGGESTED') {
      return 'danger';
    }

    if (application.status === 'AI_TEST_SENT') {
      return 'warning';
    }

    return 'neutral';
  }

  getAiStateLabel(application: ApplicationResponse): string {
    if (application.aiTestCheatingSuspicion) {
      const warnings = application.aiTestWarningCount ?? 0;
      return warnings > 0
        ? `Suspicion de triche - ${warnings} avertissement(s)`
        : 'Suspicion de triche';
    }

    if (application.status === 'INTERVIEW' && application.aiTestId) {
      return `Test réussi${application.aiTestScore !== null ? ` - ${application.aiTestScore}%` : ''}`;
    }

    if (application.status === 'REJECTION_SUGGESTED') {
      return `Refus proposé${application.aiTestScore !== null ? ` - ${application.aiTestScore}%` : ''}`;
    }

    if (application.status === 'AI_TEST_IN_PROGRESS') {
      return 'Test en cours';
    }

    if (application.status === 'AI_TEST_SENT') {
      return 'Test en attente';
    }

    return '';
  }

  getAiStateTone(application: ApplicationResponse): 'neutral' | 'success' | 'warning' | 'danger' {
    if (application.aiTestCheatingSuspicion) {
      return 'danger';
    }

    if (application.status === 'INTERVIEW') {
      return 'success';
    }

    if (application.status === 'REJECTION_SUGGESTED') {
      return 'danger';
    }

    if (application.status === 'AI_TEST_SENT' || application.status === 'AI_TEST_IN_PROGRESS') {
      return 'warning';
    }

    return 'neutral';
  }

  showAiSecurityBox(application: ApplicationResponse): boolean {
    return !!application.aiTestId && (
      !!application.aiTestCheatingSuspicion
      || (application.aiTestWarningCount ?? 0) > 0
      || (application.aiTestTabSwitchCount ?? 0) > 0
      || this.normalizeAiTestStatus(application.aiTestStatus) === 'EXPIRED'
    );
  }

  getAiSecurityTone(application: ApplicationResponse): 'warning' | 'danger' | 'neutral' {
    if (application.aiTestCheatingSuspicion) {
      return 'danger';
    }

    if ((application.aiTestWarningCount ?? 0) > 0 || this.normalizeAiTestStatus(application.aiTestStatus) === 'EXPIRED') {
      return 'warning';
    }

    return 'neutral';
  }

  getAiSecurityHeadline(application: ApplicationResponse): string {
    if (application.aiTestCheatingSuspicion) {
      return 'Suspicion de triche détectée';
    }

    if (this.normalizeAiTestStatus(application.aiTestStatus) === 'EXPIRED') {
      return 'Temps du test expiré';
    }

    return 'Surveillance du test active';
  }

  getAiSecurityReason(application: ApplicationResponse): string {
    if (application.aiTestClosedReason?.trim()) {
      return application.aiTestClosedReason;
    }

    if ((application.aiTestWarningCount ?? 0) > 0) {
      return "Le candidat a quitté la page du test ou changé d'onglet pendant l'examen.";
    }

    return 'Aucun incident majeur remonté pour ce test.';
  }

  getAiUsageLabel(application: ApplicationResponse): string {
    const seconds = this.getAiUsedSeconds(application);
    if (seconds <= 0) {
      return 'Temps utilisé non disponible';
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes <= 0) {
      return `${remainingSeconds}s utilisées`;
    }

    return `${minutes} min ${String(remainingSeconds).padStart(2, '0')} s utilisées`;
  }

  getInterviewDateLabel(application: ApplicationResponse): string {
    if (!application.interviewDateTime) {
      return '';
    }

    const parsed = new Date(application.interviewDateTime);
    if (Number.isNaN(parsed.getTime())) {
      return application.interviewDateTime.replace('T', ' ');
    }

    return parsed.toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getInterviewModeLabel(mode: string | null | undefined): string {
    switch ((mode || '').toUpperCase()) {
      case 'EN_LIGNE':
        return 'En ligne';
      case 'PRESENTIEL':
        return 'Présentiel';
      case 'TELEPHONE':
        return 'Téléphone';
      default:
        return '';
    }
  }

  getInterviewTypeLabel(type: string | null | undefined): string {
    switch ((type || '').toUpperCase()) {
      case 'RH':
        return 'RH';
      case 'TECHNIQUE':
        return 'Technique';
      case 'FINAL':
        return 'Final';
      default:
        return 'Entretien';
    }
  }

  getInterviewContactPoint(application: ApplicationResponse): string {
    if (application.interviewMode === 'EN_LIGNE') {
      return application.interviewMeetingLink || 'Lien non précisé';
    }

    if (application.interviewMode === 'PRESENTIEL') {
      return application.interviewLocation || 'Adresse non précisée';
    }

    return 'Échange téléphonique';
  }

  hasInterviewReminders(application: ApplicationResponse): boolean {
    return !!application.interviewReminder24hSent || !!application.interviewReminder1hSent;
  }

  getInterviewReminderLabels(application: ApplicationResponse): string[] {
    const labels: string[] = [];

    if (application.interviewReminder24hSent) {
      labels.push('Rappel 24h envoyé');
    }

    if (application.interviewReminder1hSent) {
      labels.push('Rappel 1h envoyé');
    }

    return labels;
  }

  getInterviewPlannerIntro(application: ApplicationResponse): string {
    if (this.plannerMode === 'reschedule') {
      return `Replanifiez l'entretien de ${application.candidateName} pour ${application.offerTitle}, puis renvoyez une invitation claire.`;
    }

    return `Planifiez l'entretien de ${application.candidateName} pour ${application.offerTitle}, personnalisez le message et appuyez-vous sur la préparation IA.`;
  }

  onPlannerOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget && !this.plannerSaving) {
      this.closeInterviewPlanner();
    }
  }

  getEmptyStateMessage(status: AtsStatus): string {
    if (this.loading) {
      return 'Chargement des candidatures...';
    }

    if (this.hasActiveFilters) {
      return status === 'APPLIED'
        ? 'Aucune candidature à trier pour le moment avec le filtre actuel.'
        : 'Aucun candidat avec le filtre actuel.';
    }

    switch (status) {
      case 'APPLIED':
        return 'Aucune candidature à trier pour le moment.';
      case 'AI_TEST_SENT':
        return 'Aucun test IA envoyé pour le moment.';
      case 'INTERVIEW':
        return 'Aucun entretien à planifier pour le moment.';
      case 'ENTRETIEN_PLANIFIE':
        return 'Aucun entretien planifié pour le moment.';
      case 'ENTRETIEN_EN_COURS':
        return 'Aucun entretien en cours pour le moment.';
      case 'ABSENCE_A_VERIFIER':
        return 'Aucune absence à vérifier pour le moment.';
      case 'REJECTION_SUGGESTED':
        return 'Aucun refus proposé pour le moment.';
      case 'REJECTED':
        return 'Aucun candidat refusé pour le moment.';
      case 'RETENU':
        return 'Aucun candidat retenu pour le moment.';
      default:
        return 'Aucune candidature à trier pour le moment.';
    }
  }

  private loadRecruiterOffers(): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.offerService.getRecruiterOffers().subscribe({
      next: (offers) => {
        this.recruiterOffers = offers;
        if (this.selectedOfferId && !offers.some((item) => item.id === this.selectedOfferId)) {
          this.selectedOfferId = null;
        }
        this.loadApplications();
      },
      error: (error: { message?: string }) => {
        this.loading = false;
        this.errorMessage = error.message || 'Chargement des offres impossible.';
      }
    });
  }

  private loadApplications(): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.applicationService.getRecruiterApplications({
      offerId: this.selectedOfferId,
      minScore: null
    }).subscribe({
      next: (applications) => {
        this.applications = applications;
        this.loading = false;
        this.tryOpenPendingPlanner();
      },
      error: (error: { message?: string }) => {
        this.loading = false;
        this.errorMessage = error.message || 'Chargement des candidatures impossible.';
      }
    });
  }

  private getApplicationScore(candidate: ApplicationResponse): number {
    const score = Number(candidate.score);
    return Number.isFinite(score) ? score : 0;
  }

  private countByStatuses(statuses: AtsStatus[]): number {
    return this.filteredApplications.filter((candidate) => statuses.includes(this.getDisplayColumnStatus(candidate))).length;
  }

  private formatShare(value: number, total: number): string {
    if (!total) {
      return '0% du total';
    }

    return `${Math.round((value / total) * 1000) / 10}% du total`;
  }

  private getDisplayColumnStatus(application: ApplicationResponse): AtsStatus {
    const aiTestStatus = this.normalizeAiTestStatus(application.aiTestStatus);
    const aiRecommendation = (application.aiTestRecommendation || '').trim().toUpperCase();

    switch (application.status) {
      case 'AI_TEST_IN_PROGRESS':
      case 'AI_TEST_SENT':
        return 'AI_TEST_SENT';
      case 'AI_TEST_COMPLETED':
      case 'INTERVIEW':
        return 'INTERVIEW';
      case 'ENTRETIEN_PLANIFIE':
      case 'ENTRETIEN_EN_COURS':
      case 'ABSENCE_A_VERIFIER':
      case 'REJECTION_SUGGESTED':
      case 'REJECTED':
      case 'RETENU':
      case 'APPLIED':
        return application.status;
      default:
        break;
    }

    if (application.aiTestCheatingSuspicion
      || aiTestStatus === 'CHEATING_SUSPECTED'
      || aiTestStatus === 'EXPIRED'
      || aiRecommendation === 'REJECTION_SUGGESTED') {
      return 'REJECTION_SUGGESTED';
    }

    if (aiTestStatus === 'SUBMITTED' && aiRecommendation === 'INTERVIEW') {
      return 'INTERVIEW';
    }

    if (aiTestStatus === 'IN_PROGRESS' || aiTestStatus === 'NOT_STARTED') {
      return 'AI_TEST_SENT';
    }

    return 'APPLIED';
  }

  private tryOpenPendingPlanner(): void {
    if (!this.pendingPlannerApplicationId || this.plannerOpen) {
      return;
    }

    const application = this.applications.find((item) => item.id === this.pendingPlannerApplicationId);
    if (!application) {
      return;
    }

    this.pendingPlannerApplicationId = null;
    this.openInterviewPlanner(application);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { planInterviewFor: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  private createDefaultPlannerForm(): InterviewPlannerForm {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      interviewType: 'TECHNIQUE',
      mode: 'EN_LIGNE',
      date: this.toInputDate(tomorrow),
      startTime: '10:00',
      durationMinutes: 60,
      meetingLink: '',
      location: '',
      invitationMessage: ''
    };
  }

  private patchPlannerFromApplication(application: ApplicationResponse): void {
    if (application.interviewType) {
      this.plannerForm.interviewType = application.interviewType as InterviewPlannerForm['interviewType'];
    }

    if (application.interviewMode) {
      this.plannerForm.mode = application.interviewMode as InterviewPlannerForm['mode'];
    }

    if (application.interviewDurationMinutes) {
      this.plannerForm.durationMinutes = application.interviewDurationMinutes;
    }

    this.plannerForm.meetingLink = application.interviewMeetingLink || '';
    this.plannerForm.location = application.interviewLocation || '';

    if (application.interviewDateTime) {
      const parsed = new Date(application.interviewDateTime);
      if (!Number.isNaN(parsed.getTime())) {
        this.plannerForm.date = this.toInputDate(parsed);
        this.plannerForm.startTime = parsed.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
      }
    }

    this.updateInvitationMessage(true);
  }

  private toInterviewPayload(): ScheduleInterviewPayload {
    return {
      interviewType: this.plannerForm.interviewType,
      mode: this.plannerForm.mode,
      date: this.plannerForm.date,
      startTime: this.plannerForm.startTime,
      durationMinutes: this.plannerForm.durationMinutes,
      meetingLink: this.plannerForm.meetingLink,
      location: this.plannerForm.location,
      invitationMessage: this.plannerForm.invitationMessage
    };
  }

  private syncApplicationInterview(applicationId: number, interview: InterviewResponse, status: AtsStatus): void {
    this.applications = this.applications.map((item) => item.id === applicationId ? {
      ...item,
      status,
      interviewId: interview.id,
      interviewStatus: interview.status,
      interviewDateTime: interview.interviewDateTime,
      interviewDurationMinutes: interview.durationMinutes,
      interviewType: interview.interviewType,
      interviewMode: interview.mode,
      interviewMeetingLink: interview.meetingLink,
      interviewLocation: interview.location,
      interviewReminder24hSent: interview.reminder24hSent,
      interviewReminder1hSent: interview.reminder1hSent,
      interviewAttendanceStatus: interview.attendanceStatus
    } : item);
  }

  private buildFallbackInterviewQuestions(application: ApplicationResponse): string[] {
    const offerTitle = application.offerTitle || 'ce poste';
    const missingSkills = application.missingSkills.slice(0, 2);
    const weaknessQuestion = missingSkills.length
      ? `Comment compenseriez-vous aujourd'hui vos points de vigilance autour de ${missingSkills.join(' et ')} ?`
      : `Quelles seraient vos priorites techniques durant vos premieres semaines sur ${offerTitle} ?`;

    return [
      `Quelles realisations vous rendent le plus pertinent pour le poste de ${offerTitle} ?`,
      `Comment abordez-vous un probleme technique ou organisationnel complexe dans ce type de mission ?`,
      weaknessQuestion
    ];
  }

  private buildFallbackInvitationMessage(application: ApplicationResponse): string {
    const dateLabel = this.formatPlannerDate(this.plannerForm.date);
    const timeLabel = this.plannerForm.startTime || 'À confirmer';
    const durationLabel = this.plannerForm.durationMinutes ? `${this.plannerForm.durationMinutes} minutes` : 'À confirmer';
    const modeLabel = this.getInterviewModeLabel(this.plannerForm.mode) || 'À confirmer';
    const interviewTypeLabel = this.getInterviewTypeLabel(this.plannerForm.interviewType) || 'entretien';
    const candidateName = application.candidateName || 'Candidat';
    const offerTitle = application.offerTitle || 'ce poste';
    const recruiterName = this.user?.username || 'L’équipe recrutement';

    let contactLine = '';
    if (this.plannerForm.mode === 'EN_LIGNE') {
      contactLine = `Lien de réunion : ${this.plannerForm.meetingLink.trim() || 'À confirmer'}`;
    } else if (this.plannerForm.mode === 'PRESENTIEL') {
      contactLine = `Adresse : ${this.plannerForm.location.trim() || 'À confirmer'}`;
    } else {
      contactLine = "Téléphone : échange téléphonique";
    }

    return `Bonjour ${candidateName},\n\nSuite à votre candidature pour le poste de ${offerTitle}, nous avons le plaisir de vous inviter à un entretien ${interviewTypeLabel}.\n\nDate : ${dateLabel}\nHeure : ${timeLabel}\nDurée : ${durationLabel}\nMode : ${modeLabel}\n${contactLine}\n\nMerci d’être présent à l’heure prévue.\n\nCordialement,\n${recruiterName}`;
  }

  onPlannerFieldChange(): void {
    this.updateInvitationMessage();
  }

  onInvitationMessageChange(value: string): void {
    this.plannerForm.invitationMessage = value;
    this.plannerMessageManuallyEdited = true;
  }

  regenerateInvitationMessage(): void {
    this.plannerMessageManuallyEdited = false;
    this.updateInvitationMessage(true);
  }

  private updateInvitationMessage(force = false, preferredMessage?: string): void {
    if (!this.plannerApplication) {
      return;
    }

    if (this.plannerMessageManuallyEdited && !force) {
      return;
    }

    this.plannerForm.invitationMessage = preferredMessage?.trim()
      ? preferredMessage
      : this.buildFallbackInvitationMessage(this.plannerApplication);
  }

  private formatPlannerDate(value: string): string {
    if (!value) {
      return 'À confirmer';
    }

    const parts = value.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    return value;
  }

  private toInputDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getAiUsedSeconds(application: ApplicationResponse): number {
    const startedAt = this.parseDate(application.aiTestStartedAt);
    const endAt = this.parseDate(application.aiTestSubmittedAt || application.aiTestCompletedAt || application.aiTestExpiresAt);

    if (!startedAt || !endAt) {
      return 0;
    }

    return Math.max(0, Math.floor((endAt.getTime() - startedAt.getTime()) / 1000));
  }

  private normalizeAiTestStatus(status: string | null | undefined): string {
    return (status || '').trim().toUpperCase();
  }

  private mapStatusToApiStatus(status: AtsStatus): string {
    return this.statusOptions.find((option) => option.value === status)?.apiStatus || status;
  }

  private parseDate(value: string | null | undefined): Date | null {
    if (!value) {
      return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private buildDefaultRejectionEmail(application: ApplicationResponse): string {
    return `Bonjour ${application.candidateName},\n\nNous vous remercions pour l'interet porte a notre offre de ${application.offerTitle}.\n\nApres analyse de votre candidature et des resultats du test de preselection, nous sommes au regret de vous informer que votre profil n'a pas ete retenu pour la suite du processus.\n\nNous vous encourageons a continuer a developper vos competences et nous vous souhaitons beaucoup de reussite dans vos prochaines demarches.\n\nCordialement,\n${this.user?.username || 'Le recruteur'}\n${application.companyName || 'Smart Recruit'}`;
  }
}

