import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApplicationResponse, ApplicationService, AtsStatus } from '../services/application.service';
import { AuthService, AuthUser } from '../services/auth.service';

interface AtsColumn {
  key: AtsStatus;
  title: string;
  accent: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  user: AuthUser | null;
  minScore = 70;
  draggedCandidateId: number | null = null;
  applications: ApplicationResponse[] = [];
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
    private readonly router: Router
  ) {
    this.user = this.authService.getCurrentUser();

    if (!this.user) {
      this.router.navigate(['/login']);
    }
  }

  ngOnInit(): void {
    this.loadApplications();
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

  getColumnApplications(status: AtsStatus): ApplicationResponse[] {
    return this.filteredApplications.filter((candidate) => candidate.status === status);
  }

  getColumnCount(status: AtsStatus): number {
    return this.getColumnApplications(status).length;
  }

  setMinScore(event: Event): void {
    this.minScore = Number((event.target as HTMLInputElement).value);
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

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private loadApplications(): void {
    this.loading = true;
    this.errorMessage = '';

    this.applicationService.getRecruiterApplications().subscribe({
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
