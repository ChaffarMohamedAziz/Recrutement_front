import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ApplicationResponse, ApplicationService } from '../services/application.service';
import { AuthService } from '../services/auth.service';
import { OfferResponse, OfferService } from '../services/offer.service';

interface CandidateStatCard {
  value: string;
  label: string;
  detail: string;
}

@Component({
  selector: 'app-candidate-space',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './candidate-space.component.html',
  styleUrl: './candidate-space.component.css'
})
export class CandidateSpaceComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly applicationService = inject(ApplicationService);
  private readonly offerService = inject(OfferService);

  readonly user = this.authService.getCurrentUser();

  applications: ApplicationResponse[] = [];
  recommendedOffers: OfferResponse[] = [];
  loading = false;
  errorMessage = '';

  readonly quickActions = [
    {
      icon: 'PRO',
      title: 'Mon profil',
      description: 'Mettez a jour vos informations, vos competences et votre presentation professionnelle.',
      link: '/profile',
      label: 'Acceder au profil'
    },
    {
      icon: 'CV',
      title: 'Deposer mon CV',
      description: 'Ajoutez une version recente de votre CV pour accelerer vos candidatures.',
      link: '/submit-resume',
      label: 'Televerser'
    },
    {
      icon: 'JOB',
      title: 'Explorer les offres',
      description: 'Consultez les offres actives et postulez aux opportunites adaptees a votre profil.',
      link: '/job-list',
      label: 'Voir les emplois'
    }
  ];

  ngOnInit(): void {
    this.loadCandidateWorkspace();
  }

  get quickStats(): CandidateStatCard[] {
    const interviews = this.applications.filter((item) => item.status === 'ENTRETIEN').length;
    const retained = this.applications.filter((item) => item.status === 'RETENU').length;

    return [
      {
        value: String(this.applications.length).padStart(2, '0'),
        label: 'Mes candidatures',
        detail: 'Dossiers deja envoyes'
      },
      {
        value: String(interviews).padStart(2, '0'),
        label: 'Entretiens',
        detail: 'Etapes en cours'
      },
      {
        value: String(retained).padStart(2, '0'),
        label: 'Retenus',
        detail: 'Processus avances'
      },
      {
        value: String(this.recommendedJobs.length).padStart(2, '0'),
        label: 'Offres recommandees',
        detail: 'Compatibilite la plus forte'
      }
    ];
  }

  get applicationStages(): CandidateStatCard[] {
    return [
      {
        value: String(this.applications.filter((item) => item.status === 'A_TRIER').length).padStart(2, '0'),
        label: 'A trier',
        detail: 'Candidatures en attente de revue'
      },
      {
        value: String(this.applications.filter((item) => item.status === 'ENTRETIEN').length).padStart(2, '0'),
        label: 'En entretien',
        detail: 'Echanges ou rendez-vous planifies'
      },
      {
        value: String(this.applications.filter((item) => item.status === 'RETENU').length).padStart(2, '0'),
        label: 'Retenus',
        detail: 'Dossiers les plus avances'
      },
      {
        value: String(this.applications.filter((item) => item.status === 'REFUSE').length).padStart(2, '0'),
        label: 'Refuses',
        detail: 'Pour garder une vision claire du pipeline'
      }
    ];
  }

  get recentApplications(): ApplicationResponse[] {
    return this.applications.slice(0, 4);
  }

  get recommendedJobs(): OfferResponse[] {
    return [...this.recommendedOffers]
      .filter((item) => !item.alreadyApplied)
      .sort((left, right) => (right.compatibilityScore ?? 0) - (left.compatibilityScore ?? 0))
      .slice(0, 4);
  }

  private loadCandidateWorkspace(): void {
    this.loading = true;
    this.errorMessage = '';

    this.applicationService.getMyApplications().subscribe({
      next: (applications) => {
        this.applications = applications;
        this.loadRecommendedOffers();
      },
      error: (error: { message?: string }) => {
        this.loading = false;
        this.errorMessage = error.message || 'Chargement de l espace candidat impossible.';
      }
    });
  }

  private loadRecommendedOffers(): void {
    this.offerService.getOffers().subscribe({
      next: (offers) => {
        this.recommendedOffers = offers;
        this.loading = false;
      },
      error: (error: { message?: string }) => {
        this.loading = false;
        this.errorMessage = error.message || 'Chargement des offres recommandees impossible.';
      }
    });
  }
}
