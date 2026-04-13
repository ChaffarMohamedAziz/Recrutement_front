import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AssistantService } from '../services/assistant.service';
import { CompetenceItem, CompetenceService } from '../services/competence.service';
import { OfferPayload, OfferResponse, OfferService, OfferSkillRequirement } from '../services/offer.service';
import { PageHeroComponent } from '../shared/page-hero/page-hero.component';

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
  loading = false;
  saving = false;
  aiDraftLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly assistantService: AssistantService,
    private readonly competenceService: CompetenceService,
    private readonly offerService: OfferService
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
    this.loadCompetences();
    this.loadRecruiterOffers();
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

  addSkill(): void {
    this.skillsArray.push(this.createSkillGroup());
  }

  removeSkill(index: number): void {
    if (this.skillsArray.length === 1) {
      return;
    }
    this.skillsArray.removeAt(index);
  }

  onCompetenceChange(index: number): void {
    const group = this.skillsArray.at(index) as FormGroup;
    const competenceId = Number(group.get('competenceId')?.value);
    const selectedCompetence = this.availableCompetences.find((item) => item.id === competenceId);

    if (!selectedCompetence) {
      return;
    }

    group.patchValue({
      nom: selectedCompetence.nom
    });
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

    const payload: OfferPayload = {
      titre: this.postJobForm.value.title || '',
      categorie: this.postJobForm.value.category || '',
      description: this.postJobForm.value.description || '',
      localisation: this.postJobForm.value.location || '',
      salaire: Number(this.postJobForm.value.salary || 0),
      devise: this.postJobForm.value.currency || 'TND',
      nombrePostes: Number(this.postJobForm.value.vacancies || 1),
      experienceRequise: this.postJobForm.value.experience || '',
      typeContrat: this.postJobForm.value.jobType || '',
      statut: 'PUBLIEE',
      dateExpiration: this.postJobForm.value.expirationDate || '',
      competences: (this.skillsArray.getRawValue() as OfferSkillRequirement[]).filter((item) => item.nom?.trim())
    };

    if (!payload.competences.length) {
      this.saving = false;
      this.errorMessage = 'Ajoutez au moins une competence valide avant de publier.';
      return;
    }

    this.offerService.createOffer(payload).subscribe({
      next: (response) => {
        this.saving = false;
        this.successMessage = `L'offre "${response.titre}" a ete publiee avec succes.`;
        this.recruiterOffers = [response, ...this.recruiterOffers];
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
      },
      error: (error: { message?: string }) => {
        this.saving = false;
        this.errorMessage = error.message || "Publication de l'offre impossible.";
        this.successMessage = '';
      }
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
      },
      error: (error: { message?: string }) => {
        this.loading = false;
        this.errorMessage = error.message || 'Chargement des offres impossible.';
      }
    });
  }

  private createSkillGroup(): FormGroup {
    return this.fb.group({
      competenceId: [null],
      nom: [''],
      type: ['OBLIGATOIRE'],
      ponderation: [60],
      niveau: ['Intermediaire']
    });
  }
}
