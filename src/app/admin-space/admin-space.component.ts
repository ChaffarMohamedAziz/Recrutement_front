import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CompetenceService } from '../services/competence.service';
import { AuthService, RegisterResult, UserSummary } from '../services/auth.service';
import { OfferResponse, OfferService } from '../services/offer.service';
import { PageHeroComponent } from '../shared/page-hero/page-hero.component';

interface AdminKpiCard {
  label: string;
  value: string;
  detail: string;
  tone: 'primary' | 'success' | 'warning' | 'neutral';
}

interface AdminDistributionRow {
  label: string;
  value: number;
  helper: string;
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
}

interface AdminQuickLink {
  title: string;
  description: string;
  link: string;
  label: string;
}

@Component({
  selector: 'app-admin-space',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeroComponent],
  templateUrl: './admin-space.component.html',
  styleUrl: './admin-space.component.css'
})
export class AdminSpaceComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly offerService = inject(OfferService);
  private readonly competenceService = inject(CompetenceService);

  readonly user = this.authService.getCurrentUser();
  readonly quickLinks: AdminQuickLink[] = [
    {
      title: 'Demandes recruteurs',
      description: 'Validez ou refusez rapidement les comptes en attente.',
      link: '/admin/recruiter-activation',
      label: 'Ouvrir'
    },
    {
      title: 'Utilisateurs',
      description: 'Consultez les comptes candidats et recruteurs.',
      link: '/admin/users',
      label: 'Voir la liste'
    },
    {
      title: 'Tags competences',
      description: 'Maintenez un referentiel propre pour le matching.',
      link: '/admin/tags',
      label: 'Gerer'
    }
  ];

  loading = false;
  errorMessage = '';
  kpis: AdminKpiCard[] = [];
  platformRows: AdminDistributionRow[] = [];
  recruiterRows: AdminDistributionRow[] = [];
  offerHighlights: Array<{ label: string; count: number }> = [];

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      users: this.authService.getUsers(),
      recruiters: this.authService.getRecruiterAccounts(),
      offers: this.offerService.getOffers(),
      competences: this.competenceService.getAdminCompetences()
    }).subscribe({
      next: ({ users, recruiters, offers, competences }) => {
        this.buildDashboard(users, recruiters, offers, competences.length);
        this.loading = false;
      },
      error: (error: { message?: string }) => {
        this.loading = false;
        this.errorMessage = error.message || 'Chargement du dashboard admin impossible.';
      }
    });
  }

  private buildDashboard(
    users: UserSummary[],
    recruiters: RegisterResult[],
    offers: OfferResponse[],
    competencesCount: number
  ): void {
    const normalizedUsers = users.map((item) => ({
      ...item,
      role: (item.role || '').replace('ROLE_', '').toUpperCase()
    }));

    const candidatesCount = normalizedUsers.filter((item) => item.role === 'CANDIDATE').length;
    const recruitersCount = normalizedUsers.filter((item) => item.role === 'RECRUITER').length;
    const pendingRecruiters = recruiters.filter((item) => this.getRecruiterStatus(item) === 'PENDING').length;
    const approvedRecruiters = recruiters.filter((item) => this.getRecruiterStatus(item) === 'APPROVED').length;
    const refusedRecruiters = recruiters.filter((item) => this.getRecruiterStatus(item) === 'REFUSED').length;

    this.kpis = [
      {
        label: 'Utilisateurs totaux',
        value: String(normalizedUsers.length).padStart(2, '0'),
        detail: 'Vue globale des comptes actifs',
        tone: 'primary'
      },
      {
        label: 'Recruteurs en attente',
        value: String(pendingRecruiters).padStart(2, '0'),
        detail: 'Comptes a valider manuellement',
        tone: 'warning'
      },
      {
        label: 'Candidats actifs',
        value: String(candidatesCount).padStart(2, '0'),
        detail: 'Profils consultables actuellement',
        tone: 'success'
      },
      {
        label: 'Offres publiees',
        value: String(offers.length).padStart(2, '0'),
        detail: 'Opportunites visibles cote candidat',
        tone: 'neutral'
      }
    ];

    this.platformRows = [
      {
        label: 'Candidats',
        value: candidatesCount,
        helper: 'Base active de talents',
        tone: 'success'
      },
      {
        label: 'Recruteurs',
        value: recruitersCount,
        helper: 'Comptes recruteurs valides',
        tone: 'primary'
      },
      {
        label: 'Tags competences',
        value: competencesCount,
        helper: 'Referentiel commun de matching',
        tone: 'neutral'
      }
    ];

    this.recruiterRows = [
      {
        label: 'En attente',
        value: pendingRecruiters,
        helper: 'A verifier par l admin',
        tone: 'warning'
      },
      {
        label: 'Approuves',
        value: approvedRecruiters,
        helper: 'Peuvent publier des offres',
        tone: 'success'
      },
      {
        label: 'Refuses',
        value: refusedRecruiters,
        helper: 'Historique des validations refusees',
        tone: 'danger'
      }
    ];

    this.offerHighlights = this.buildOfferHighlights(offers);
  }

  private buildOfferHighlights(offers: OfferResponse[]): Array<{ label: string; count: number }> {
    const counts = new Map<string, number>();

    offers.forEach((offer) => {
      const category = offer.categorie || 'Autres';
      counts.set(category, (counts.get(category) || 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 4);
  }

  private getRecruiterStatus(recruiter: RegisterResult): 'PENDING' | 'APPROVED' | 'REFUSED' {
    if (recruiter.approvalStatus === 'PENDING' || recruiter.approvalStatus === 'APPROVED' || recruiter.approvalStatus === 'REFUSED') {
      return recruiter.approvalStatus;
    }

    return recruiter.statutCompte ? 'APPROVED' : 'PENDING';
  }
}
