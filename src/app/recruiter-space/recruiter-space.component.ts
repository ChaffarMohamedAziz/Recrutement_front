import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ApplicationResponse, ApplicationService } from '../services/application.service';
import { AuthService } from '../services/auth.service';
import { OfferResponse, OfferService } from '../services/offer.service';
import { PageHeroComponent } from '../shared/page-hero/page-hero.component';

interface RecruiterStatCard {
  label: string;
  value: string;
  detail: string;
  tone: 'primary' | 'success' | 'warning' | 'neutral';
}

@Component({
  selector: 'app-recruiter-space',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeroComponent],
  templateUrl: './recruiter-space.component.html',
  styleUrl: './recruiter-space.component.css'
})
export class RecruiterSpaceComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly offerService = inject(OfferService);
  private readonly applicationService = inject(ApplicationService);

  readonly user = this.authService.getCurrentUser();
  recruiterOffers: OfferResponse[] = [];
  applications: ApplicationResponse[] = [];
  loading = false;
  errorMessage = '';

  ngOnInit(): void {
    this.loadWorkspace();
  }

  get userInitials(): string {
    const name = this.user?.username || 'Recruteur';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((item) => item.charAt(0).toUpperCase())
      .join('');
  }

  get kpis(): RecruiterStatCard[] {
    const interviews = this.applications.filter((item) => item.status === 'ENTRETIEN').length;
    const retained = this.applications.filter((item) => item.status === 'RETENU').length;
    const averageScore = this.applications.length
      ? Math.round(this.applications.reduce((sum, item) => sum + item.score, 0) / this.applications.length)
      : 0;

    return [
      {
        label: 'Offres actives',
        value: String(this.recruiterOffers.length).padStart(2, '0'),
        detail: 'Offres visibles cote candidat',
        tone: 'primary'
      },
      {
        label: 'Candidatures',
        value: String(this.applications.length).padStart(2, '0'),
        detail: 'Profils deja recus',
        tone: 'neutral'
      },
      {
        label: 'Entretiens',
        value: String(interviews).padStart(2, '0'),
        detail: 'Etapes recrutement en cours',
        tone: 'warning'
      },
      {
        label: 'Score moyen',
        value: `${averageScore}%`,
        detail: 'Qualite moyenne du pipeline',
        tone: retained ? 'success' : 'neutral'
      }
    ];
  }

  get recentOffers(): OfferResponse[] {
    return [...this.recruiterOffers]
      .sort((left, right) => new Date(right.datePublication).getTime() - new Date(left.datePublication).getTime())
      .slice(0, 4);
  }

  get candidateSpotlights(): ApplicationResponse[] {
    return [...this.applications]
      .sort((left, right) => right.score - left.score)
      .slice(0, 4);
  }

  get activityRows(): Array<{ label: string; value: string; helper: string }> {
    return [
      {
        label: 'Offres publiees',
        value: String(this.recruiterOffers.length),
        helper: 'Posts actifs dans votre espace'
      },
      {
        label: 'Profils retenus',
        value: String(this.applications.filter((item) => item.status === 'RETENU').length),
        helper: 'Candidats en phase avancee'
      },
      {
        label: 'Profils refuses',
        value: String(this.applications.filter((item) => item.status === 'REFUSE').length),
        helper: 'Historique du pipeline'
      }
    ];
  }

  get workspaceActions(): Array<{ title: string; description: string; link: string; label: string; tone: 'primary' | 'secondary' }> {
    return [
      {
        title: 'Messagerie candidature',
        description: 'Repondez rapidement aux candidats et gardez les conversations rattachees a chaque dossier.',
        link: '/messages',
        label: 'Ouvrir la messagerie',
        tone: 'primary'
      },
      {
        title: 'Assistant IA',
        description: 'Generez une description d offre, trouvez des talents en langage naturel et preparez vos entretiens.',
        link: '/assistant',
        label: 'Lancer l assistant',
        tone: 'secondary'
      }
    ];
  }

  private loadWorkspace(): void {
    this.loading = true;
    this.errorMessage = '';

    this.offerService.getRecruiterOffers().subscribe({
      next: (offers) => {
        this.recruiterOffers = offers;
        this.loadApplications();
      },
      error: (error: { message?: string }) => {
        this.loading = false;
        this.errorMessage = error.message || 'Chargement de l espace recruteur impossible.';
      }
    });
  }

  private loadApplications(): void {
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
