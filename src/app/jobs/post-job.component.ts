import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { catchError, of } from 'rxjs';
import { AssistantService } from '../services/assistant.service';
import {
  AiQuestionResponse,
  AiTestResponse,
  AiTestService,
  AiQuestionType
} from '../services/ai-test.service';
import { CompetenceItem, CompetenceService } from '../services/competence.service';
import { OfferPayload, OfferResponse, OfferService, OfferSkillRequirement } from '../services/offer.service';
import { PageHeroComponent } from '../shared/page-hero/page-hero.component';

interface AiQuestionTypeOption {
  value: AiQuestionType;
  label: string;
}

@Component({
  selector: 'app-post-job',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, PageHeroComponent],
  templateUrl: './post-job.component.html',
  styleUrl: './post-job.component.css'
})
export class PostJobComponent implements OnInit {
  readonly postJobForm: FormGroup;
  readonly categories = [
    'Informatique & technologie',
    'Developpement web',
    'UX/UI Design',
    'Data & BI',
    'DevOps & Cloud',
    'Marketing digital',
    'Ressources humaines'
  ];
  readonly currencies = ['TND', 'USD', 'EURO'];
  readonly jobTypes = ['CDI', 'CDD', 'Stage', 'Temps plein', 'Temps partiel'];
  readonly skillTypes = ['OBLIGATOIRE', 'SOUHAITEE'];
  readonly skillLevels = ['Debutant', 'Intermediaire', 'Avance', 'Expert'];

  availableCompetences: CompetenceItem[] = [];
  recruiterOffers: OfferResponse[] = [];
  selectedAiEvaluationSkills: string[] = [];
  aiTestEnabled = false;
  aiTestDraft: AiTestResponse | null = null;
  aiTestLoading = false;
  aiTestSaving = false;
  aiTestGenerating = false;
  aiTestValidating = false;
  loading = false;
  saving = false;
  aiDraftLoading = false;
  deletingOfferId: number | null = null;
  publishingOfferId: number | null = null;
  editingOfferId: number | null = null;
  editingOfferStatus: string | null = null;
  requestedEditOfferId: number | null = null;
  errorMessage = '';
  successMessage = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly assistantService: AssistantService,
    private readonly competenceService: CompetenceService,
    private readonly offerService: OfferService,
    private readonly aiTestService: AiTestService
  ) {
    this.postJobForm = this.fb.group({
      title: ['', Validators.required],
      category: ['Informatique & technologie', Validators.required],
      salary: [2500, Validators.required],
      currency: ['TND', Validators.required],
      vacancies: [1, Validators.required],
      location: ['Tunis', Validators.required],
      jobType: ['CDI', Validators.required],
      experience: ['2-4 ans', Validators.required],
      expirationDate: [''],
      description: ['', Validators.required],
      skills: this.fb.array([this.createSkillGroup()])
    });
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const rawValue = params.get('editOfferId');
      const parsedValue = rawValue ? Number(rawValue) : null;
      this.requestedEditOfferId = parsedValue && !Number.isNaN(parsedValue) ? parsedValue : null;

      if (this.requestedEditOfferId === null && this.isEditingOffer) {
        this.resetEditor(false);
      } else {
        this.tryOpenRequestedEditOffer();
      }
    });
    this.loadCompetences();
    this.loadRecruiterOffers();
  }

  get isEditingOffer(): boolean {
    return this.editingOfferId !== null;
  }

  get currentSubmitLabel(): string {
    if (this.saving) {
      return this.isEditingOffer ? 'Enregistrement...' : 'Enregistrement...';
    }

    if (this.loading) {
      return 'Chargement...';
    }

    return this.isEditingOffer ? "Enregistrer les modifications" : 'Enregistrer';
  }

  get publicationProgress(): number {
    const values = this.postJobForm.getRawValue();
    const checks = [
      !!values.title,
      !!values.category,
      !!values.salary,
      !!values.location,
      !!values.jobType,
      !!values.experience,
      !!values.description,
      this.skillsArray.controls.some((control) => !!control.get('nom')?.value || !!control.get('competenceId')?.value)
    ];

    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }

  get requiredSkillsCount(): number {
    return this.skillsArray.getRawValue()
      .filter((item: OfferSkillRequirement) => item.type === 'OBLIGATOIRE' && (item.nom || item.competenceId))
      .length;
  }

  get preferredSkillsCount(): number {
    return this.skillsArray.getRawValue()
      .filter((item: OfferSkillRequirement) => item.type === 'SOUHAITEE' && (item.nom || item.competenceId))
      .length;
  }

  get skillsArray(): FormArray {
    return this.postJobForm.get('skills') as FormArray;
  }

  get hasPersistedOfferForAiTest(): boolean {
    return this.editingOfferId !== null;
  }

  get aiTestQuestionTypeOptions(): AiQuestionTypeOption[] {
    return [
      { value: 'QCM', label: 'QCM' },
      { value: 'SHORT_TEXT', label: 'SHORT_TEXT' },
      { value: 'SCENARIO', label: 'SCENARIO' }
    ];
  }

  get aiEvaluationSkillOptions(): string[] {
    return (this.skillsArray.getRawValue() as OfferSkillRequirement[])
      .map((item) => `${item.nom || ''}`.trim())
      .filter(Boolean);
  }

  get aiTestTotalDurationLabel(): string {
    const totalSeconds = this.aiTestDraft?.totalDurationSeconds ?? 0;
    if (!totalSeconds) {
      return '0 min';
    }
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return seconds ? `${minutes} min ${seconds}s` : `${minutes} min`;
  }

  get canGenerateAiTest(): boolean {
    return this.aiTestEnabled && !this.aiTestGenerating && !this.aiTestSaving && !this.saving;
  }

  get canValidateAiTest(): boolean {
    return !!this.aiTestDraft?.id && !!this.aiTestDraft.questions?.length && !this.aiTestValidating;
  }

  addSkill(): void {
    this.skillsArray.push(this.createSkillGroup());
    this.syncAiEvaluationSkills();
  }

  removeSkill(index: number): void {
    if (this.skillsArray.length === 1) {
      return;
    }
    this.skillsArray.removeAt(index);
    this.syncAiEvaluationSkills();
  }

  onCompetenceChange(index: number): void {
    const group = this.skillsArray.at(index) as FormGroup;
    const competenceId = Number(group.get('competenceId')?.value);
    const selectedCompetence = this.availableCompetences.find((item) => item.id === competenceId);

    if (!selectedCompetence) {
      group.patchValue(
        {
          competenceId: null
        },
        { emitEvent: false }
      );
      return;
    }

    group.patchValue(
      {
        competenceId: selectedCompetence.id,
        nom: selectedCompetence.nom
      },
      { emitEvent: false }
    );
    this.syncAiEvaluationSkills();
  }

  onCompetenceNameInput(index: number): void {
    const group = this.skillsArray.at(index) as FormGroup;
    const typedName = `${group.get('nom')?.value || ''}`.trim();
    const matchedCompetence = this.availableCompetences.find(
      (item) => this.normalizeSkillKey(item.nom) === this.normalizeSkillKey(typedName)
    );

    group.patchValue(
      {
        competenceId: matchedCompetence?.id ?? null,
        nom: typedName
      },
      { emitEvent: false }
    );
    this.syncAiEvaluationSkills();
  }

  isManualSkill(index: number): boolean {
    const group = this.skillsArray.at(index) as FormGroup;
    const skillName = `${group.get('nom')?.value || ''}`.trim();
    const competenceId = group.get('competenceId')?.value;
    return !!skillName && !competenceId;
  }

  publishJob(): void {
    if (this.saving || this.loading) {
      return;
    }

    if (this.postJobForm.invalid) {
      this.postJobForm.markAllAsTouched();
      this.errorMessage = "Veuillez remplir les champs obligatoires avant de publier l'offre.";
      this.successMessage = '';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = this.buildOfferPayload();

    if (!payload.competences.length) {
      this.saving = false;
      this.errorMessage = 'Ajoutez au moins une competence valide avant de publier.';
      return;
    }

    const request$ = this.isEditingOffer && this.editingOfferId !== null
      ? this.offerService.updateOffer(this.editingOfferId, payload)
      : this.offerService.createOffer(payload);

    request$.subscribe({
      next: (response) => {
        this.saving = false;
        this.successMessage = this.isEditingOffer
          ? `L'offre "${response.titre}" a ete enregistree avec succes.`
          : `Offre enregistree avec succes. Commencez a preparer le Test IA pour pouvoir la publier.`;
        this.upsertRecruiterOffer(response);
        this.loadCompetences();
        this.startEditingOffer(response, false, false);
        this.syncAiTestAfterOfferSave(response.id);
      },
      error: (error: { message?: string }) => {
        this.saving = false;
        this.errorMessage = error.message || (this.isEditingOffer
          ? "Mise a jour de l'offre impossible."
          : "Publication de l'offre impossible.");
        this.successMessage = '';
      }
    });
  }

  startEditingOffer(offer: OfferResponse, syncRoute = true, loadAiTest = true): void {
    this.editingOfferId = offer.id;
    this.editingOfferStatus = offer.statut || 'EN_ATTENTE_TEST_IA';
    this.errorMessage = '';
    this.successMessage = '';

    this.postJobForm.patchValue({
      title: offer.titre || '',
      category: offer.categorie || 'Informatique & technologie',
      salary: offer.salaire || 0,
      currency: offer.devise || 'TND',
      vacancies: offer.nombrePostes || 1,
      location: offer.localisation || '',
      jobType: offer.typeContrat || 'CDI',
      experience: offer.experienceRequise || '',
      expirationDate: offer.dateExpiration || '',
      description: offer.description || ''
    });

    this.skillsArray.clear();
    if (offer.competences?.length) {
      for (const competence of offer.competences) {
        this.skillsArray.push(this.createSkillGroup({
          competenceId: competence.competenceId ?? null,
          nom: competence.nom || '',
          type: competence.type || 'OBLIGATOIRE',
          ponderation: competence.ponderation ?? 60,
          niveau: competence.niveau || 'Intermediaire'
        }));
      }
    } else {
      this.skillsArray.push(this.createSkillGroup());
    }

    this.postJobForm.markAsPristine();
    this.postJobForm.markAsUntouched();

    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (loadAiTest) {
      this.loadOfferAiTest(offer.id);
    }

    if (syncRoute) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { editOfferId: offer.id },
        queryParamsHandling: 'merge'
      });
    }
  }

  cancelEditing(): void {
    this.resetEditor();
    this.successMessage = '';
    this.errorMessage = '';
  }

  deleteOffer(offer: OfferResponse): void {
    if (this.deletingOfferId !== null || this.saving) {
      return;
    }

    const confirmed = window.confirm(`Voulez-vous supprimer l'offre "${offer.titre}" ?`);
    if (!confirmed) {
      return;
    }

    this.deletingOfferId = offer.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.offerService.deleteOffer(offer.id).subscribe({
      next: (response) => {
        this.deletingOfferId = null;
        this.recruiterOffers = this.recruiterOffers.filter((item) => item.id !== offer.id);
        if (this.editingOfferId === offer.id) {
          this.resetEditor();
        }
        this.successMessage = response.message || `L'offre "${offer.titre}" a ete supprimee avec succes.`;
      },
      error: (error: { message?: string }) => {
        this.deletingOfferId = null;
        this.errorMessage = error.message || "Suppression de l'offre impossible.";
        this.successMessage = '';
      }
    });
  }

  isDeletingOffer(offerId: number): boolean {
    return this.deletingOfferId === offerId;
  }

  publishOffer(offer: OfferResponse): void {
    if (this.publishingOfferId !== null || this.saving || this.deletingOfferId !== null) {
      return;
    }

    if (!this.hasValidatedAiTest(offer)) {
      this.errorMessage = 'Vous devez préparer et valider le Test IA avant de publier cette offre.';
      this.successMessage = '';
      return;
    }

    this.publishingOfferId = offer.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.offerService.publishOffer(offer.id).subscribe({
      next: (response) => {
        this.publishingOfferId = null;
        this.upsertRecruiterOffer(response);
        this.successMessage = `L'offre "${response.titre}" a ete publiee avec succes.`;
        if (this.editingOfferId === response.id) {
          this.editingOfferStatus = response.statut || 'PUBLIEE';
        }
      },
      error: (error: { message?: string }) => {
        this.publishingOfferId = null;
        this.errorMessage = error.message || 'Vous devez préparer et valider le Test IA avant de publier cette offre.';
      }
    });
  }

  isPublishingOffer(offerId: number): boolean {
    return this.publishingOfferId === offerId;
  }

  hasValidatedAiTest(offer: OfferResponse): boolean {
    const status = (offer.aiTestStatus || '').toUpperCase();
    return !!offer.hasAiTest && ['VALIDATED', 'PUBLISHED'].includes(status);
  }

  getOfferStatusLabel(offer: OfferResponse): string {
    const status = (offer.statut || '').toUpperCase();
    switch (status) {
      case 'PUBLIEE':
      case 'PUBLISHED':
        return 'Publié';
      case 'BROUILLON':
      case 'DRAFT':
        return 'Brouillon';
      case 'ARCHIVEE':
      case 'ARCHIVED':
        return 'Archivée';
      case 'EN_ATTENTE_TEST_IA':
        return 'En attente Test IA';
      default:
        return status || 'Brouillon';
    }
  }

  getAiTestStateLabel(offer: OfferResponse): string {
    return this.hasValidatedAiTest(offer) ? 'Test IA validé' : 'Test IA à préparer';
  }

  prepareAiTest(offer: OfferResponse): void {
    this.startEditingOffer(offer);
    this.aiTestEnabled = true;
    this.onAiTestToggle();
    setTimeout(() => {
      document.querySelector('.ai-test-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  generateDescriptionWithAi(): void {
    if (this.aiDraftLoading || this.saving || this.loading) {
      return;
    }

    const rawTitle = (this.postJobForm.value.title || '').trim();
    if (!rawTitle) {
      this.errorMessage = "Ajoutez d'abord un titre de poste avant de lancer l'assistant IA.";
      this.successMessage = '';
      this.postJobForm.get('title')?.markAsTouched();
      return;
    }

    this.aiDraftLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.assistantService.generateOfferDraft({
      title: rawTitle,
      category: this.postJobForm.value.category || '',
      location: this.postJobForm.value.location || '',
      contractType: this.postJobForm.value.jobType || '',
      experienceLevel: this.postJobForm.value.experience || '',
      tone: 'Professionnel et attractif',
      context: this.postJobForm.value.description || '',
      skills: (this.skillsArray.getRawValue() as OfferSkillRequirement[])
        .map((item) => item.nom?.trim())
        .filter(Boolean)
    }).subscribe({
      next: (response) => {
        this.aiDraftLoading = false;
        this.postJobForm.patchValue({
          description: response.generatedDescription
        });
        this.successMessage = response.message || "La description de l'offre a ete generee par l'assistant IA.";
      },
      error: (error: { message?: string }) => {
        this.aiDraftLoading = false;
        this.errorMessage = error.message || "Generation de la description impossible.";
      }
    });
  }

  private loadCompetences(): void {
    this.competenceService.getCompetences().subscribe({
      next: (items) => {
        this.availableCompetences = items;
      },
      error: (error: { message?: string }) => {
        this.errorMessage = error.message || 'Chargement des competences impossible.';
      }
    });
  }

  private loadRecruiterOffers(): void {
    this.loading = true;
    this.offerService.getRecruiterOffers().subscribe({
      next: (items) => {
        this.recruiterOffers = items;
        this.loading = false;
        this.tryOpenRequestedEditOffer();
      },
      error: (error: { message?: string }) => {
        this.loading = false;
        this.errorMessage = error.message || 'Chargement des offres impossible.';
      }
    });
  }

  private buildOfferPayload(): OfferPayload {
    return {
      titre: this.postJobForm.value.title || '',
      categorie: this.postJobForm.value.category || '',
      description: this.postJobForm.value.description || '',
      localisation: this.postJobForm.value.location || '',
      salaire: Number(this.postJobForm.value.salary || 0),
      devise: this.postJobForm.value.currency || 'TND',
      nombrePostes: Number(this.postJobForm.value.vacancies || 1),
      experienceRequise: this.postJobForm.value.experience || '',
      typeContrat: this.postJobForm.value.jobType || '',
      statut: this.editingOfferStatus || 'EN_ATTENTE_TEST_IA',
      dateExpiration: this.postJobForm.value.expirationDate || '',
      competences: (this.skillsArray.getRawValue() as OfferSkillRequirement[]).filter((item) => item.nom?.trim())
    };
  }

  private resetEditor(syncRoute = true): void {
    this.editingOfferId = null;
    this.editingOfferStatus = null;
    this.aiTestEnabled = false;
    this.aiTestDraft = null;
    this.aiTestLoading = false;
    this.aiTestSaving = false;
    this.aiTestGenerating = false;
    this.aiTestValidating = false;
    this.postJobForm.reset({
      title: '',
      category: 'Informatique & technologie',
      salary: 2500,
      currency: 'TND',
      vacancies: 1,
      location: 'Tunis',
      jobType: 'CDI',
      experience: '2-4 ans',
      expirationDate: '',
      description: ''
    });
    this.skillsArray.clear();
    this.skillsArray.push(this.createSkillGroup());

    if (syncRoute) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { editOfferId: null },
        queryParamsHandling: 'merge'
      });
    }
  }

  private upsertRecruiterOffer(offer: OfferResponse): void {
    const existingIndex = this.recruiterOffers.findIndex((item) => item.id === offer.id);
    if (existingIndex === -1) {
      this.recruiterOffers = [offer, ...this.recruiterOffers];
      return;
    }

    this.recruiterOffers = this.recruiterOffers.map((item) => item.id === offer.id ? offer : item);
  }

  private createSkillGroup(skill?: Partial<OfferSkillRequirement>): FormGroup {
    return this.fb.group({
      competenceId: [skill?.competenceId ?? null],
      nom: [skill?.nom ?? ''],
      type: [skill?.type ?? 'OBLIGATOIRE'],
      ponderation: [skill?.ponderation ?? 60],
      niveau: [skill?.niveau ?? 'Intermediaire']
    });
  }

  private normalizeSkillKey(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '');
  }

  private tryOpenRequestedEditOffer(): void {
    if (this.requestedEditOfferId === null || !this.recruiterOffers.length) {
      return;
    }

    if (this.editingOfferId === this.requestedEditOfferId) {
      return;
    }

    const offer = this.recruiterOffers.find((item) => item.id === this.requestedEditOfferId);
    if (!offer) {
      this.errorMessage = "L'offre a modifier est introuvable dans votre liste.";
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { editOfferId: null },
        queryParamsHandling: 'merge'
      });
      return;
    }

    this.startEditingOffer(offer, false);
  }

  onAiTestToggle(): void {
    if (!this.aiTestEnabled) {
      this.aiTestDraft = null;
      this.selectedAiEvaluationSkills = [];
      return;
    }

    if (!this.aiTestDraft) {
      const suggestedQuestionCount = Math.max(
        1,
        Math.min(10, this.selectedAiEvaluationSkills.length || this.aiEvaluationSkillOptions.length || this.skillsArray.length || 1)
      );
      this.aiTestDraft = {
        id: 0,
        applicationId: null,
        offerId: this.editingOfferId,
        candidateId: null,
        recruiterId: null,
        offerTitle: this.postJobForm.value.title || '',
        companyName: '',
        candidateName: '',
        title: this.postJobForm.value.title ? `Test IA - ${this.postJobForm.value.title}` : 'Test IA',
        description: this.postJobForm.value.description || '',
        status: 'DRAFT',
        threshold: 70,
        passingScore: 70,
        durationMinutes: 0,
        totalDurationSeconds: 0,
        numberOfQuestions: suggestedQuestionCount,
        score: null,
        recommendation: '',
        difficulty: 'INTERMEDIAIRE',
        allowPreviousQuestion: false,
        currentQuestionIndex: 0,
        totalQuestions: 0,
        questionStartedAt: '',
        questionExpiresAt: '',
        createdAt: '',
        updatedAt: '',
        startedAt: '',
        expiresAt: '',
        submittedAt: '',
        completedAt: '',
        timeRemainingSeconds: null,
        closedReason: '',
        cheatingSuspicion: false,
        tabSwitchCount: 0,
        warningCount: 0,
        report: '',
        strengths: [],
        weaknesses: [],
        generatedReport: '',
        proposedRejectionEmail: '',
        evaluationSkills: [],
        questions: []
      };
    }

    if (!this.selectedAiEvaluationSkills.length) {
      this.selectedAiEvaluationSkills = this.aiEvaluationSkillOptions;
    }

    if (this.hasPersistedOfferForAiTest) {
      this.saveAiTestConfiguration();
    }
  }

  isAiSkillSelected(skillName: string): boolean {
    return this.selectedAiEvaluationSkills.includes(skillName);
  }

  toggleAiSkillSelection(skillName: string): void {
    if (this.selectedAiEvaluationSkills.includes(skillName)) {
      this.selectedAiEvaluationSkills = this.selectedAiEvaluationSkills.filter((item) => item !== skillName);
      return;
    }

    this.selectedAiEvaluationSkills = [...this.selectedAiEvaluationSkills, skillName];
  }

  saveAiTestConfiguration(showSuccess = true): void {
    if (!this.aiTestEnabled || this.aiTestSaving) {
      return;
    }
    this.ensureOfferReadyForAiTest((offerId) => {
      this.aiTestSaving = true;
      this.errorMessage = '';
      this.successMessage = '';

      this.aiTestService.configureOfferAiTest(offerId, this.buildAiTestPayload()).subscribe({
        next: (test) => {
          this.aiTestSaving = false;
          this.aiTestDraft = this.normalizeAiTestDraft(test);
          if (showSuccess) {
            this.successMessage = 'La configuration du Test IA a ete enregistree.';
          }
        },
        error: (error: { message?: string }) => {
          this.aiTestSaving = false;
          this.errorMessage = error.message || 'Configuration du Test IA impossible.';
        }
      });
    });
  }

  generateAiTest(): void {
    if (!this.aiTestEnabled || this.aiTestGenerating) {
      return;
    }

    this.ensureOfferReadyForAiTest((offerId) => {
      this.aiTestGenerating = true;
      this.errorMessage = '';
      this.successMessage = '';

      this.aiTestService.generateOfferAiTest(offerId, this.buildAiTestPayload()).subscribe({
        next: (test) => {
          this.aiTestGenerating = false;
          this.aiTestDraft = this.normalizeAiTestDraft(test);
          this.successMessage = 'Les questions du Test IA ont ete generees.';
        },
        error: (error: { message?: string }) => {
          this.aiTestGenerating = false;
          this.errorMessage = error.message || 'Generation du Test IA impossible.';
        }
      });
    });
  }

  validateAiTest(): void {
    if (!this.aiTestDraft?.id || this.aiTestValidating) {
      return;
    }

    this.aiTestValidating = true;
    this.errorMessage = '';

    this.aiTestService.validateRecruiterAiTest(this.aiTestDraft.id).subscribe({
      next: (test) => {
        this.aiTestValidating = false;
        this.aiTestDraft = this.normalizeAiTestDraft(test);
        this.successMessage = 'Le Test IA a ete valide et associe a l offre.';
        this.loadRecruiterOffers();
      },
      error: (error: { message?: string }) => {
        this.aiTestValidating = false;
        this.errorMessage = error.message || 'Validation du Test IA impossible.';
      }
    });
  }

  updateAiQuestionField(question: AiQuestionResponse, field: 'questionText' | 'correctAnswer' | 'expectedAnswer' | 'questionType', value: string): void {
    const draftQuestion = this.getDraftQuestion(question.id);
    if (!draftQuestion) {
      return;
    }

    if (field === 'questionType') {
      const normalizedType = this.normalizeAiQuestionType(value);
      this.patchAiQuestionLocally(question.id, { questionType: normalizedType, type: normalizedType });
      return;
    }

    this.patchAiQuestionLocally(question.id, { [field]: value });
  }

  updateAiQuestionNumber(question: AiQuestionResponse, field: 'points' | 'timeLimitSeconds' | 'orderIndex', value: number): void {
    if (!this.getDraftQuestion(question.id)) {
      return;
    }

    const normalizedValue = field === 'timeLimitSeconds'
      ? this.normalizeQuestionTimeLimit(value)
      : Number(value) || 0;

    this.patchAiQuestionLocally(question.id, { [field]: normalizedValue });
  }

  updateAiQuestionOptions(question: AiQuestionResponse, rawValue: string): void {
    const options = rawValue
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
    this.patchAiQuestionLocally(question.id, { options });
  }

  acceptAiQuestion(question: AiQuestionResponse): void {
    this.persistAiQuestion(question.id, { acceptedByRecruiter: true });
  }

  saveAiQuestion(question: AiQuestionResponse): void {
    this.persistAiQuestion(question.id, {});
  }

  regenerateAiQuestion(question: AiQuestionResponse): void {
    if (!question.id) {
      return;
    }

    this.aiTestSaving = true;
    this.aiTestService.regenerateRecruiterAiQuestion(question.id).subscribe({
      next: (test) => {
        this.aiTestSaving = false;
        this.aiTestDraft = this.normalizeAiTestDraft(test);
        this.successMessage = 'La question a ete regeneree avec l IA.';
      },
      error: (error: { message?: string }) => {
        this.aiTestSaving = false;
        this.errorMessage = error.message || 'Regeneration de la question impossible.';
      }
    });
  }

  deleteAiQuestion(question: AiQuestionResponse): void {
    if (!question.id) {
      return;
    }

    this.aiTestSaving = true;
    this.aiTestService.deleteRecruiterAiQuestion(question.id).subscribe({
      next: () => {
        this.aiTestSaving = false;
        if (this.editingOfferId) {
          this.loadOfferAiTest(this.editingOfferId, false);
        }
      },
      error: (error: { message?: string }) => {
        this.aiTestSaving = false;
        this.errorMessage = error.message || 'Suppression de la question impossible.';
      }
    });
  }

  questionOptionsValue(question: AiQuestionResponse): string {
    return (question.options || []).join('\n');
  }

  onQuestionTypeChange(index: number, newType: string): void {
    const question = this.aiTestDraft?.questions?.[index];
    if (!question) {
      return;
    }

    const normalizedType = this.normalizeAiQuestionType(newType);
    const currentQuestion = this.getDraftQuestion(question.id);
    if (!currentQuestion) {
      return;
    }

    const patch: Partial<AiQuestionResponse> = {
      questionType: normalizedType,
      type: normalizedType
    };

    if (normalizedType === 'QCM') {
      patch.options = currentQuestion.options?.length ? [...currentQuestion.options] : ['', '', '', ''].filter(Boolean);
      patch.expectedAnswer = '';
    } else {
      patch.options = [];
      patch.correctAnswer = normalizedType === 'SHORT_TEXT' || normalizedType === 'SCENARIO'
        ? ''
        : currentQuestion.correctAnswer ?? '';
    }

    this.patchAiQuestionLocally(question.id, patch);
  }

  isMcqQuestion(question: AiQuestionResponse): boolean {
    return this.getNormalizedQuestionType(question) === 'QCM';
  }

  getQuestionTypeValue(question: AiQuestionResponse): AiQuestionType {
    return this.getNormalizedQuestionType(question);
  }

  isFreeTextQuestion(question: AiQuestionResponse): boolean {
    const normalizedType = this.getNormalizedQuestionType(question);
    return normalizedType === 'SHORT_TEXT' || normalizedType === 'SCENARIO';
  }

  getAiQuestionTypeLabel(questionType: AiQuestionType | string | null | undefined): string {
    switch (this.normalizeAiQuestionType(questionType)) {
      case 'QCM':
        return 'QCM';
      case 'SHORT_TEXT':
        return 'SHORT_TEXT';
      case 'SCENARIO':
        return 'SCENARIO';
      default:
        return `${questionType || ''}`.trim() || 'QCM';
    }
  }

  updateAiTestConfig(field: 'numberOfQuestions' | 'passingScore' | 'difficulty' | 'allowPreviousQuestion', value: number | string | boolean): void {
    if (!this.aiTestDraft) {
      return;
    }

    const normalizedValue = field === 'numberOfQuestions'
      ? Math.max(1, Number(value) || 1)
      : field === 'passingScore'
        ? Number(value)
        : value;

    this.aiTestDraft = {
      ...this.aiTestDraft,
      threshold: field === 'passingScore' ? Number(normalizedValue) : this.aiTestDraft.threshold,
      passingScore: field === 'passingScore' ? Number(normalizedValue) : this.aiTestDraft.passingScore,
      [field]: normalizedValue
    };
  }

  private loadOfferAiTest(offerId: number, silent = true): void {
    this.aiTestLoading = true;
    this.aiTestService.getRecruiterOfferAiTest(offerId).pipe(
      catchError((error: { message?: string }) => {
        this.aiTestLoading = false;
        this.aiTestDraft = null;
        this.aiTestEnabled = false;
        this.selectedAiEvaluationSkills = this.aiEvaluationSkillOptions;
        if (!silent) {
          this.errorMessage = error.message || 'Chargement du Test IA impossible.';
        }
        return of(null);
      })
    ).subscribe((test) => {
      this.aiTestLoading = false;
      if (!test) {
        return;
      }
      this.aiTestDraft = this.normalizeAiTestDraft(test);
      this.aiTestEnabled = true;
      this.selectedAiEvaluationSkills = test.evaluationSkills?.length ? [...test.evaluationSkills] : this.aiEvaluationSkillOptions;
    });
  }

  private persistAiQuestion(questionId: number, patch: Partial<AiQuestionResponse>): void {
    const question = this.getDraftQuestion(questionId);
    if (!question?.id) {
      return;
    }

    this.aiTestSaving = true;
    this.aiTestService.updateRecruiterAiQuestion(question.id, {
      questionText: patch.questionText ?? question.questionText,
      questionType: (patch.questionType ?? question.questionType) as AiQuestionType,
      options: patch.options ?? question.options,
      correctAnswer: patch.correctAnswer ?? question.correctAnswer ?? '',
      expectedAnswer: patch.expectedAnswer ?? question.expectedAnswer ?? '',
      points: Number(patch.points ?? question.points ?? 20),
      orderIndex: Number(patch.orderIndex ?? question.orderIndex ?? 0),
      timeLimitSeconds: Number(patch.timeLimitSeconds ?? question.timeLimitSeconds ?? 180),
      acceptedByRecruiter: patch.acceptedByRecruiter ?? question.acceptedByRecruiter ?? false
    }).subscribe({
      next: (test) => {
        this.aiTestSaving = false;
        this.aiTestDraft = this.normalizeAiTestDraft(test);
      },
      error: (error: { message?: string }) => {
        this.aiTestSaving = false;
        this.errorMessage = error.message || 'Mise a jour de la question impossible.';
      }
    });
  }

  private patchAiQuestionLocally(questionId: number, patch: Partial<AiQuestionResponse>): void {
    if (!this.aiTestDraft?.questions?.length) {
      return;
    }

    const updatedQuestions = this.aiTestDraft.questions.map((item) => {
      if (item.id !== questionId) {
        return item;
      }

      const nextQuestionType = patch.questionType
        ? this.normalizeAiQuestionType(patch.questionType)
        : this.getNormalizedQuestionType(item);

      return {
        ...item,
        ...patch,
        questionType: nextQuestionType,
        type: nextQuestionType,
        options: patch.options !== undefined ? [...patch.options] : [...(item.options || [])]
      };
    });

    this.aiTestDraft = {
      ...this.aiTestDraft,
      questions: updatedQuestions,
      totalDurationSeconds: this.computeAiTestTotalDurationSeconds(updatedQuestions),
      durationMinutes: Math.ceil(this.computeAiTestTotalDurationSeconds(updatedQuestions) / 60)
    };
  }

  private getDraftQuestion(questionId: number): AiQuestionResponse | null {
    return this.aiTestDraft?.questions?.find((item) => item.id === questionId) || null;
  }

  private buildAiTestPayload() {
    const resolvedQuestionCount = Math.max(
      1,
      Number(this.aiTestDraft?.numberOfQuestions ?? this.aiTestDraft?.questions?.length ?? 1) || 1
    );

    return {
      enabled: this.aiTestEnabled,
      title: this.postJobForm.value.title ? `Test IA - ${this.postJobForm.value.title}` : 'Test IA',
      description: this.postJobForm.value.description || '',
      numberOfQuestions: resolvedQuestionCount,
      threshold: this.aiTestDraft?.passingScore ?? 70,
      durationMinutes: this.aiTestDraft?.totalDurationSeconds
        ? Math.ceil(this.aiTestDraft.totalDurationSeconds / 60)
        : (this.aiTestDraft?.durationMinutes ?? 0),
      difficulty: this.aiTestDraft?.difficulty || 'INTERMEDIAIRE',
      allowPreviousQuestion: this.aiTestDraft?.allowPreviousQuestion ?? false,
      evaluationSkills: this.selectedAiEvaluationSkills.length
        ? this.selectedAiEvaluationSkills
        : this.aiEvaluationSkillOptions
    };
  }

  private syncAiTestAfterOfferSave(offerId: number): void {
    if (!this.aiTestEnabled) {
      return;
    }

    this.saveAiTestConfiguration(false);
  }

  private ensureOfferReadyForAiTest(onReady: (offerId: number) => void): void {
    if (this.postJobForm.invalid) {
      this.postJobForm.markAllAsTouched();
      this.errorMessage = "Veuillez d'abord completer les informations de l'offre avant d'utiliser le Test IA.";
      this.successMessage = '';
      return;
    }

    const payload = this.buildOfferPayload();
    if (!payload.competences.length) {
      this.errorMessage = "Ajoutez au moins une competence valide avant d'utiliser le Test IA.";
      this.successMessage = '';
      return;
    }

    if (this.editingOfferId === null) {
      this.errorMessage = "Enregistrez d'abord l'offre avant de configurer ou generer le Test IA.";
      this.successMessage = '';
      return;
    }

    if (this.postJobForm.dirty) {
      this.errorMessage = "Enregistrez d'abord les modifications de l'offre avant de modifier le Test IA.";
      this.successMessage = '';
      return;
    }

    onReady(this.editingOfferId);
  }

  private syncAiEvaluationSkills(): void {
    const options = this.aiEvaluationSkillOptions;
    this.selectedAiEvaluationSkills = this.selectedAiEvaluationSkills.filter((item) => options.includes(item));
    if (!this.selectedAiEvaluationSkills.length) {
      this.selectedAiEvaluationSkills = options;
    }
  }

  private normalizeQuestionTimeLimit(value: number): number {
    return Math.max(30, Math.round(Number(value) || 30));
  }

  private computeAiTestTotalDurationSeconds(questions: AiQuestionResponse[] = []): number {
    return questions.reduce(
      (sum, question) => sum + this.normalizeQuestionTimeLimit(Number(question.timeLimitSeconds ?? 180)),
      0
    );
  }

  private normalizeAiQuestionType(value: string | null | undefined): AiQuestionType {
    const normalized = `${value || ''}`.trim().toUpperCase();
    if (normalized === 'QCM' || normalized === 'MCQ') {
      return 'QCM';
    }
    if (normalized === 'SCENARIO') {
      return 'SCENARIO';
    }
    return 'SHORT_TEXT';
  }

  private normalizeAiTestDraft(test: AiTestResponse): AiTestResponse {
    return {
      ...test,
      questions: (test.questions || []).map((question) => ({
        ...question,
        questionType: this.normalizeAiQuestionType(question.type || question.questionType),
        type: this.normalizeAiQuestionType(question.type || question.questionType),
        options: [...(question.options || [])]
      }))
    };
  }

  private getNormalizedQuestionType(question: Pick<AiQuestionResponse, 'questionType' | 'type'>): AiQuestionType {
    return this.normalizeAiQuestionType(question.type || question.questionType);
  }
}
