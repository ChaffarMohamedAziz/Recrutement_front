import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CompetenceItem, CompetenceService } from '../services/competence.service';
import { OfferPayload, OfferResponse, OfferService, OfferSkillRequirement } from '../services/offer.service';

@Component({
  selector: 'app-post-job',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
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
  errorMessage = '';
  successMessage = '';

  constructor(
    private readonly fb: FormBuilder,
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
    if (this.postJobForm.invalid || this.saving) {
      this.postJobForm.markAllAsTouched();
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
      }
    });
  }

  private loadCompetences(): void {
    this.competenceService.getCompetences().subscribe({
      next: (items) => {
        this.availableCompetences = items;
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
      error: () => {
        this.loading = false;
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
