import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CompetenceItem, CompetencePayload, CompetenceService } from '../../services/competence.service';
import { PageHeroComponent } from '../../shared/page-hero/page-hero.component';

@Component({
  selector: 'app-tags',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PageHeroComponent],
  templateUrl: './tags.component.html',
  styleUrl: './tags.component.css'
})
export class TagsComponent implements OnInit {
  private readonly competenceService = inject(CompetenceService);
  private readonly fb = inject(FormBuilder);

  readonly competenceCategories = [
    'Développement Frontend',
    'Développement Backend',
    'Développement Mobile',
    'Full Stack',
    'Langage de programmation',
    'Base de données',
    'DevOps',
    'Cloud',
    'Cybersécurité',
    'Intelligence Artificielle',
    'Data Science',
    'Data Engineering',
    'Réseaux',
    'Systèmes embarqués',
    'QA / Test',
    'UI/UX Design',
    'Gestion de projet',
    'Business / Analyse',
    'Marketing digital',
    'Vente / Commercial',
    'Communication',
    'Finance / Comptabilité',
    'Ressources humaines',
    'Bureautique',
    'Langues',
    'Soft Skills'
  ];
  readonly filterTypes = ['Toutes', ...this.competenceCategories];
  readonly form = this.fb.group({
    nom: ['', Validators.required],
    type: [this.competenceCategories[0], Validators.required],
    description: ['']
  });

  competences: CompetenceItem[] = [];
  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';
  searchTerm = '';
  selectedType = 'Toutes';
  editingId: number | null = null;

  ngOnInit(): void {
    this.loadCompetences();
  }

  get activeCategoriesCount(): number {
    return new Set(this.competences.map((item) => item.type).filter(Boolean)).size;
  }

  loadCompetences(): void {
    this.loading = true;
    this.errorMessage = '';

    this.competenceService.getAdminCompetences(
      this.searchTerm,
      this.selectedType === 'Toutes' ? '' : this.selectedType
    ).subscribe({
      next: (items) => {
        this.competences = items;
        this.loading = false;
      },
      error: (error: { message?: string }) => {
        this.loading = false;
        this.errorMessage = error.message || 'Chargement des compétences impossible.';
      }
    });
  }

  applyFilters(): void {
    this.loadCompetences();
  }

  startEdit(item: CompetenceItem): void {
    this.editingId = item.id;
    this.form.patchValue({
      nom: item.nom,
      type: item.type,
      description: item.description
    });
    this.successMessage = '';
    this.errorMessage = '';
  }

  cancelEdit(): void {
    this.editingId = null;
    this.form.reset({
      nom: '',
      type: this.competenceCategories[0],
      description: ''
    });
  }

  saveCompetence(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload: CompetencePayload = {
      nom: this.form.value.nom?.trim() || '',
      type: this.form.value.type?.trim() || '',
      description: this.form.value.description?.trim() || ''
    };

    const request$ = this.editingId
      ? this.competenceService.updateCompetence(this.editingId, payload)
      : this.competenceService.createCompetence(payload);

    request$.subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = this.editingId
          ? 'Compétence mise à jour avec succès.'
          : 'Compétence ajoutée avec succès.';
        this.cancelEdit();
        this.loadCompetences();
      },
      error: (error: { message?: string }) => {
        this.saving = false;
        this.errorMessage = error.message || 'Enregistrement de la compétence impossible.';
      }
    });
  }

  deleteCompetence(item: CompetenceItem): void {
    if (!item?.id || this.saving) {
      return;
    }

    const confirmed = window.confirm(`Supprimer la compétence ${item.nom} ?`);
    if (!confirmed) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    this.competenceService.deleteCompetence(item.id).subscribe({
      next: (response) => {
        this.successMessage = response.message || 'Compétence supprimée.';
        this.competences = this.competences.filter((competence) => competence.id !== item.id);
      },
      error: (error: { message?: string }) => {
        this.errorMessage = error.message || 'Suppression de la compétence impossible.';
      }
    });
  }

  categoryBadge(type: string): string {
    const label = (type || '').toLowerCase();
    if (label.includes('frontend')) {
      return 'frontend';
    }
    if (label.includes('backend')) {
      return 'backend';
    }
    if (label.includes('base de données')) {
      return 'database';
    }
    if (label.includes('devops') || label.includes('cloud')) {
      return 'devops';
    }
    if (label.includes('intelligence artificielle') || label.includes('data')) {
      return 'ai';
    }
    if (label.includes('design') || label.includes('ui/ux')) {
      return 'design';
    }
    return 'default';
  }
}
