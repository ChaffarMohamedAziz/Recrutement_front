import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ApplicationResponse, ApplicationService, AtsStatus } from '../services/application.service';
import { AuthService, AuthUser } from '../services/auth.service';
import { OfferResponse, OfferService } from '../services/offer.service';
import { PageHeroComponent } from '../shared/page-hero/page-hero.component';

interface AtsColumn {
  key: AtsStatus;
  title: string;
  accent: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeroComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  user: AuthUser | null;
  minScore = 70;
  draggedCandidateId: number | null = null;
  applications: ApplicationResponse[] = [];
  recruiterOffers: OfferResponse[] = [];
  selectedOfferId: number | null = null;
  loading = false;
  errorMessage = '';

  readonly columns: AtsColumn[] = [
    { key: 'A_TRIER', title: 'A trier', accent: 'blue' },
    { key: 'ENTRETIEN', title: 'Entretien', accent: 'amber' },
    { key: 'RETENU', title: 'Retenu', accent: 'green' },
    { key: 'REFUSE', title: 'Refuse', accent: 'red' }
  ];

  constructor(
    private readonly authService: AuthService,
    private readonly applicationService: ApplicationService,
    private readonly offerService: OfferService,
    private readonly router: Router
  ) {
    this.user = this.authService.getCurrentUser();

    if (!this.user) {
      this.router.navigate(['/login']);
    }
  }

  ngOnInit(): void {
    this.loadRecruiterOffers();
  }

  get filteredApplications(): ApplicationResponse[] {
    return this.applications.filter((candidate) => candidate.score >= this.minScore);
  }

  get totalVisibleCandidates(): number {
    return this.filteredApplications.length;
  }

  get averageVisibleScore(): number {
    if (!this.filteredApplications.length) {
      return 0;
    }

    const total = this.filteredApplications.reduce((sum, candidate) => sum + candidate.score, 0);
    return Math.round(total / this.filteredApplications.length);
  }

  get currentOfferTitle(): string {
    if (!this.selectedOfferId) {
      return 'Toutes les offres';
    }

    return this.recruiterOffers.find((item) => item.id === this.selectedOfferId)?.titre || 'Offre selectionnee';
  }

  getColumnApplications(status: AtsStatus): ApplicationResponse[] {
    return this.filteredApplications.filter((candidate) => candidate.status === status);
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

  onDragStart(candidateId: number): void {
    this.draggedCandidateId = candidateId;
  }

  allowDrop(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(status: AtsStatus): void {
    if (this.draggedCandidateId === null) {
      return;
    }

    const applicationId = this.draggedCandidateId;
    const candidate = this.applications.find((item) => item.id === applicationId);
    const previousStatus = candidate?.status;

    if (!candidate || candidate.status === status) {
      this.draggedCandidateId = null;
      return;
    }

    candidate.status = status;
    this.draggedCandidateId = null;

    this.applicationService.updateRecruiterApplicationStatus(applicationId, status).subscribe({
      next: (updated) => {
        this.applications = this.applications.map((item) => item.id === updated.id ? updated : item);
      },
      error: (error: { message?: string }) => {
        if (previousStatus) {
          candidate.status = previousStatus;
        }
        this.errorMessage = error.message || 'Mise a jour du pipeline impossible.';
      }
    });
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

  private loadRecruiterOffers(): void {
    this.loading = true;
    this.errorMessage = '';

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

    this.applicationService.getRecruiterApplications({
      offerId: this.selectedOfferId,
      minScore: null
    }).subscribe({
      next: (applications) => {
        this.applications = applications;
        this.loading = false;
      },
      error: (error: { message?: string }) => {
        this.loading = false;
        this.errorMessage = error.message || 'Chargement des candidatures impossible.';
      }
    });
  }
}
