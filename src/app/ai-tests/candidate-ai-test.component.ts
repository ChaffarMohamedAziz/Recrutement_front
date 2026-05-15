import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  AiQuestionResponse,
  AiTestResponse,
  AiTestSecurityEventPayload,
  AiTestService
} from '../services/ai-test.service';
import { PageHeroComponent } from '../shared/page-hero/page-hero.component';

type NormalizedAiTestStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'EXPIRED'
  | 'CHEATING_SUSPECTED'
  | 'CLOSED'
  | 'INTERVIEW'
  | 'REJECTION_SUGGESTED'
  | 'REJECTED';

@Component({
  selector: 'app-candidate-ai-test',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeroComponent],
  templateUrl: './candidate-ai-test.component.html',
  styleUrl: './candidate-ai-test.component.css'
})
export class CandidateAiTestComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly aiTestService = inject(AiTestService);

  testId: number | null = null;
  test: AiTestResponse | null = null;
  currentAnswer = '';
  loading = false;
  starting = false;
  submitting = false;
  securityProcessing = false;
  errorMessage = '';
  successMessage = '';
  warningMessage = '';
  remainingSeconds: number | null = null;
  autoProgressMessage = '';

  private timerHandle: number | null = null;
  private lastSecurityEventAt = 0;
  private readonly securityEventCooldownMs = 1600;
  private timeoutHandled = false;

  ngOnInit(): void {
    const applicationId = Number(this.route.snapshot.paramMap.get('applicationId'));
    if (applicationId) {
      this.loadTestByApplication(applicationId);
      return;
    }

    const testId = Number(this.route.snapshot.paramMap.get('id'));
    if (!testId) {
      this.errorMessage = 'Test IA introuvable.';
      return;
    }

    this.testId = testId;
    this.loadTest(testId);
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  @HostListener('document:visibilitychange')
  onVisibilityChange(): void {
    if (typeof document !== 'undefined' && document.hidden) {
      this.handleSecurityEvent('TAB_SWITCH', "Le candidat a change d'onglet pendant le test.");
    }
  }

  @HostListener('window:blur')
  onWindowBlur(): void {
    this.handleSecurityEvent('WINDOW_BLUR', "Le candidat a quitte la fenetre du test.");
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): string | void {
    if (!this.shouldProtectExam || !this.testId) {
      return;
    }

    this.aiTestService.sendCandidateAiTestSecurityEventKeepalive(this.testId, {
      eventType: 'RELOAD_ATTEMPT',
      description: "Le candidat a tente de recharger ou fermer la page du test."
    });

    event.preventDefault();
    event.returnValue = '';
    return '';
  }

  get normalizedStatus(): NormalizedAiTestStatus {
    const status = (this.test?.status || '').trim().toUpperCase();

    switch (status) {
      case 'AI_TEST_SENT':
        return 'NOT_STARTED';
      case 'AI_TEST_COMPLETED':
        return 'SUBMITTED';
      case 'NOT_STARTED':
      case 'IN_PROGRESS':
      case 'SUBMITTED':
      case 'EXPIRED':
      case 'CHEATING_SUSPECTED':
      case 'CLOSED':
      case 'INTERVIEW':
      case 'REJECTION_SUGGESTED':
      case 'REJECTED':
        return status;
      default:
        return 'NOT_STARTED';
    }
  }

  get isPreStart(): boolean {
    return this.normalizedStatus === 'NOT_STARTED';
  }

  get isInProgress(): boolean {
    return this.normalizedStatus === 'IN_PROGRESS';
  }

  get isClosedForSuspicion(): boolean {
    return this.normalizedStatus === 'CHEATING_SUSPECTED' || !!this.test?.cheatingSuspicion;
  }

  get isExpired(): boolean {
    return this.normalizedStatus === 'EXPIRED';
  }

  get isReadonly(): boolean {
    return !this.isInProgress;
  }

  get shouldProtectExam(): boolean {
    return this.isInProgress && !this.submitting && !this.securityProcessing;
  }

  get currentQuestion(): AiQuestionResponse | null {
    return this.test?.questions?.[0] ?? null;
  }

  get currentQuestionTypeLabel(): string {
    const normalizedType = `${this.currentQuestion?.questionType || ''}`.trim().toUpperCase();
    if (normalizedType === 'MCQ' || normalizedType === 'QCM') {
      return 'QCM';
    }
    return normalizedType || 'QUESTION';
  }

  get currentQuestionNumber(): number {
    return (this.test?.currentQuestionIndex ?? 0) + 1;
  }

  get totalQuestions(): number {
    return this.test?.totalQuestions ?? this.test?.numberOfQuestions ?? this.test?.questions?.length ?? 0;
  }

  get isLastQuestion(): boolean {
    return this.currentQuestionNumber >= this.totalQuestions;
  }

  get canSubmitCurrentQuestion(): boolean {
    return !!this.currentQuestion && !this.submitting;
  }

  get timerLabel(): string {
    const totalSeconds = Math.max(0, this.remainingSeconds ?? this.test?.timeRemainingSeconds ?? 0);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  get warningCount(): number {
    return this.test?.warningCount ?? 0;
  }

  get tabSwitchCount(): number {
    return this.test?.tabSwitchCount ?? 0;
  }

  get durationLabel(): string {
    const totalSeconds = this.test?.totalDurationSeconds
      ?? (this.test?.questions || []).reduce((sum, question) => sum + Math.max(0, Number(question.timeLimitSeconds ?? 0)), 0)
      ?? 0;
    if (totalSeconds <= 0) {
      return 'Non definie';
    }
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return seconds === 0 ? `${minutes} min` : `${minutes} min ${seconds} s`;
  }

  get progressPercent(): number {
    if (!this.totalQuestions) {
      return 0;
    }
    return Math.round((this.currentQuestionNumber / this.totalQuestions) * 100);
  }

  get currentQuestionTimeLimitLabel(): string {
    const seconds = Math.max(0, Number(this.currentQuestion?.timeLimitSeconds ?? 0));
    if (!seconds) {
      return 'Temps non defini';
    }
    if (seconds < 60) {
      return `${seconds} sec`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return remainder === 0 ? `${minutes} min` : `${minutes} min ${remainder} s`;
  }

  get statusLabel(): string {
    switch (this.normalizedStatus) {
      case 'NOT_STARTED':
        return 'Pret a demarrer';
      case 'IN_PROGRESS':
        return 'En cours';
      case 'SUBMITTED':
        return 'Soumis';
      case 'EXPIRED':
        return 'Temps ecoule';
      case 'CHEATING_SUSPECTED':
        return 'Suspicion de triche';
      case 'CLOSED':
        return 'Ferme';
      case 'INTERVIEW':
        return 'Entretien propose';
      case 'REJECTION_SUGGESTED':
        return 'Refus propose';
      case 'REJECTED':
        return 'Refuse';
      default:
        return this.normalizedStatus;
    }
  }

  canDeactivate(): boolean {
    if (!this.shouldProtectExam) {
      return true;
    }

    this.handleSecurityEvent('ROUTE_LEAVE', "Le candidat a tente de quitter la page du test.");
    return false;
  }

  startTest(): void {
    if (!this.testId || this.starting || !this.isPreStart) {
      return;
    }

    this.starting = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.warningMessage = '';
    this.autoProgressMessage = '';

    this.aiTestService.startCandidateAiTest(this.testId).subscribe({
      next: (test) => {
        this.starting = false;
        this.applyTestState(test);
        this.successMessage = 'Le test IA a demarre. Restez sur cette page jusqu a la soumission.';
        this.refreshCurrentQuestion();
      },
      error: (error: { message?: string }) => {
        this.starting = false;
        this.errorMessage = error.message || 'Demarrage du test IA impossible.';
      }
    });
  }

  goNext(): void {
    if (!this.currentQuestion || !this.test?.resultId || this.submitting) {
      return;
    }

    this.submitting = true;
    const timeSpentSeconds = this.computeTimeSpentForCurrentQuestion();

    this.aiTestService.answerCurrentQuestion(this.test.resultId, {
      questionId: this.currentQuestion.id,
      candidateAnswer: this.currentAnswer.trim(),
      timeSpentSeconds
    }).subscribe({
      next: () => {
        if (this.isLastQuestion) {
          this.finalSubmit();
          return;
        }

        this.aiTestService.moveToNextQuestion(this.test!.resultId!).subscribe({
          next: (nextState) => {
            this.submitting = false;
            this.applyTestState(nextState);
            this.successMessage = '';
            if (this.autoProgressMessage) {
              this.warningMessage = this.autoProgressMessage;
            }
          },
          error: (error: { message?: string }) => {
            this.submitting = false;
            this.errorMessage = error.message || 'Passage a la question suivante impossible.';
          }
        });
      },
      error: (error: { message?: string }) => {
        this.submitting = false;
        this.errorMessage = error.message || 'Enregistrement de la reponse impossible.';
      }
    });
  }

  private finalSubmit(): void {
    if (!this.test?.resultId) {
      this.submitting = false;
      return;
    }

    this.aiTestService.submitCandidateAiTestResult(this.test.resultId).subscribe({
      next: (result) => {
        this.submitting = false;
        this.applyTestState(result);
        this.warningMessage = '';
        this.successMessage = this.autoProgressMessage
          ? this.autoProgressMessage
          : 'Votre test a ete soumis avec succes. Le recruteur sera informe du resultat.';
      },
      error: (error: { message?: string }) => {
        this.submitting = false;
        this.errorMessage = error.message || 'Soumission finale du test impossible.';
      }
    });
  }

  private loadTest(testId: number): void {
    this.loading = true;
    this.errorMessage = '';

    this.aiTestService.getCandidateAiTest(testId).subscribe({
      next: (test) => {
        this.loading = false;
        this.applyTestState(test);
        if (this.normalizedStatus === 'IN_PROGRESS' && test.resultId) {
          this.refreshCurrentQuestion();
        }
      },
      error: (error: { message?: string }) => {
        this.loading = false;
        this.errorMessage = error.message || 'Chargement du test IA impossible.';
      }
    });
  }

  private loadTestByApplication(applicationId: number): void {
    this.loading = true;
    this.errorMessage = '';

    this.aiTestService.getCandidateAiTestByApplication(applicationId).subscribe({
      next: (test) => {
        this.loading = false;
        this.testId = test.id;
        this.applyTestState(test);
        if (this.normalizedStatus === 'IN_PROGRESS' && test.resultId) {
          this.refreshCurrentQuestion();
        }
      },
      error: (error: { message?: string }) => {
        this.loading = false;
        this.errorMessage = error.message || 'Chargement du test IA impossible.';
      }
    });
  }

  private refreshCurrentQuestion(): void {
    if (!this.test?.resultId) {
      return;
    }

    this.aiTestService.getCurrentQuestion(this.test.resultId).subscribe({
      next: (test) => {
        this.applyTestState(test);
      },
      error: (error: { message?: string }) => {
        this.errorMessage = error.message || 'Chargement de la question courante impossible.';
      }
    });
  }

  private applyTestState(test: AiTestResponse): void {
    this.test = test;
    this.currentAnswer = test.questions?.[0]?.candidateAnswer || '';
    this.timeoutHandled = false;
    this.syncTimer();

    if (this.isClosedForSuspicion) {
      this.warningMessage = '';
      this.errorMessage = "Votre test a ete ferme car vous avez quitte la page de l'examen. Le recruteur sera informe.";
    } else if (this.isExpired && !this.test?.score) {
      this.warningMessage = '';
      this.errorMessage = 'Le temps du test est termine.';
    }
  }

  private syncTimer(): void {
    this.clearTimer();

    if (!this.isInProgress) {
      this.remainingSeconds = null;
      return;
    }

    const initialRemaining = Math.max(0, this.test?.timeRemainingSeconds ?? 0);
    this.remainingSeconds = initialRemaining;

    if (initialRemaining <= 0) {
      this.handleTimeExpired();
      return;
    }

    this.timerHandle = window.setInterval(() => {
      this.remainingSeconds = Math.max(0, (this.remainingSeconds ?? 0) - 1);
      if ((this.remainingSeconds ?? 0) <= 0) {
        this.clearTimer();
        this.handleTimeExpired();
      }
    }, 1000);
  }

  private clearTimer(): void {
    if (this.timerHandle !== null) {
      window.clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
  }

  private handleTimeExpired(): void {
    if (this.timeoutHandled || !this.isInProgress) {
      return;
    }

    this.timeoutHandled = true;
    this.autoProgressMessage = 'Le temps de cette question est termine. Passage a la question suivante.';
    this.goNext();
  }

  private computeTimeSpentForCurrentQuestion(): number | null {
    const question = this.currentQuestion;
    if (!question?.timeLimitSeconds) {
      return null;
    }
    const remaining = this.remainingSeconds ?? question.timeLimitSeconds;
    return Math.max(0, question.timeLimitSeconds - remaining);
  }

  private handleSecurityEvent(
    eventType: AiTestSecurityEventPayload['eventType'],
    description: string
  ): void {
    if (!this.testId || !this.shouldProtectExam) {
      return;
    }

    const now = Date.now();
    if (now - this.lastSecurityEventAt < this.securityEventCooldownMs) {
      return;
    }
    this.lastSecurityEventAt = now;

    this.securityProcessing = true;

    this.aiTestService.registerCandidateAiTestSecurityEvent(this.testId, {
      eventType,
      description
    }).subscribe({
      next: (test) => {
        this.securityProcessing = false;
        this.applyTestState(test);

        if (this.isClosedForSuspicion) {
          return;
        }

        this.errorMessage = '';
        this.warningMessage = 'Attention : quitter la page du test peut etre considere comme une tentative de triche.';
      },
      error: (error: { message?: string }) => {
        this.securityProcessing = false;
        this.errorMessage = error.message || "Surveillance du test impossible pour le moment.";
      }
    });
  }
}
