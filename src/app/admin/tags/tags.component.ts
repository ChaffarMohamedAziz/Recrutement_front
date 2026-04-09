import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CompetenceItem, CompetencePayload, CompetenceService } from '../../services/competence.service';

@Component({
  selector: 'app-tags',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './tags.component.html',
  styleUrl: './tags.component.css'
})
export class TagsComponent implements OnInit {
  private readonly competenceService = inject(CompetenceService);
  private readonly fb = inject(FormBuilder);

  readonly filterTypes = ['Toutes', 'Frontend', 'Backend', 'Base de donnees', 'Cloud', 'Soft skills', 'IA'];
  readonly form = this.fb.group({
    nom: ['', Validators.required],
    type: ['Frontend', Validators.required],
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
        this.errorMessage = error.message || 'Chargement des competences impossible.';
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
      type: 'Frontend',
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
          ? 'Competence mise a jour avec succes.'
          : 'Competence ajoutee avec succes.';
        this.cancelEdit();
        this.loadCompetences();
      },
      error: (error: { message?: string }) => {
        this.saving = false;
        this.errorMessage = error.message || 'Enregistrement de la competence impossible.';
      }
    });
  }

  deleteCompetence(item: CompetenceItem): void {
    if (!item?.id || this.saving) {
      return;
    }

    const confirmed = window.confirm(`Supprimer la competence ${item.nom} ?`);
    if (!confirmed) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    this.competenceService.deleteCompetence(item.id).subscribe({
      next: (response) => {
        this.successMessage = response.message || 'Competence supprimee.';
        this.competences = this.competences.filter((competence) => competence.id !== item.id);
      },
      error: (error: { message?: string }) => {
        this.errorMessage = error.message || 'Suppression de la competence impossible.';
      }
    });
  }
}
