import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  AdminActivityItem,
  AdminOverviewStatsResponse,
  AdminPlatformService,
  AdminSubscriptionResponse,
  AiInsightItem,
  AiTestStatsResponse,
  ServiceHealthItem
} from '../../services/admin-platform.service';
import { AuthService, RegisterResult } from '../../services/auth.service';
import { PageHeroComponent } from '../../shared/page-hero/page-hero.component';

interface AdminDashboardCard {
  label: string;
  value: string;
  detail: string;
  tone: 'primary' | 'success' | 'warning' | 'neutral';
}

interface AdminShortcut {
  title: string;
  description: string;
  link: string;
  label: string;
}

interface AlertItem {
  title: string;
  description: string;
  tone: 'warning' | 'danger' | 'success' | 'neutral';
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeroComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit {
  private readonly adminPlatformService = inject(AdminPlatformService);
  private readonly authService = inject(AuthService);

  loading = false;
  errorMessage = '';
  overview: AdminOverviewStatsResponse | null = null;
  aiStats: AiTestStatsResponse | null = null;
  pendingRecruiters = 0;
  subscriptions: AdminSubscriptionResponse[] = [];
  insights: AiInsightItem[] = [];
  serviceHealth: ServiceHealthItem[] = [];
  recentActivity: AdminActivityItem[] = [];
  alerts: AlertItem[] = [];

  readonly shortcuts: AdminShortcut[] = [
    {
      title: 'Demandes recruteurs',
      description: 'Validez rapidement les comptes en attente et sécurisez la publication des offres.',
      link: '/admin/recruiter-activation',
      label: 'Traiter'
    },
    {
      title: 'Utilisateurs',
      description: 'Consultez les comptes candidats, recruteurs et administrateurs depuis une vue unique.',
      link: '/admin/users',
      label: 'Ouvrir'
    },
    {
      title: 'Tags',
      description: 'Gardez un référentiel de compétences propre pour renforcer le matching.',
      link: '/admin/tags',
      label: 'Gérer'
    },
    {
      title: 'Statistiques',
      description: 'Accédez aux analytics détaillés, aux tendances et aux signaux IA.',
      link: '/admin/statistics',
      label: 'Analyser'
    },
    {
      title: 'Abonnements',
      description: 'Pilotez les plans SaaS FREE, STANDARD et PREMIUM des recruteurs.',
      link: '/admin/subscriptions',
      label: 'Piloter'
    }
  ];

  ngOnInit(): void {
    this.loadDashboard();
  }

  get summaryCards(): AdminDashboardCard[] {
    if (!this.overview || !this.aiStats) {
      return [];
    }

    return [
      {
        label: 'Utilisateurs totaux',
        value: String(this.overview.totalUsers),
        detail: `${this.overview.totalCandidates} candidats • ${this.overview.totalRecruiters} recruteurs`,
        tone: 'primary'
      },
      {
        label: 'Recruteurs en attente',
        value: String(this.pendingRecruiters),
        detail: 'Demandes à valider côté administration',
        tone: this.pendingRecruiters > 0 ? 'warning' : 'neutral'
      },
      {
        label: 'Offres publiées',
        value: String(this.overview.totalOffers),
        detail: `${this.overview.totalApplications} candidatures reçues`,
        tone: 'neutral'
      },
      {
        label: 'Tests IA passés',
        value: String(this.aiStats.completedTests || this.overview.totalCompletedAiTests),
        detail: `${this.aiStats.successRate}% de réussite • score moyen ${this.aiStats.averageScore}%`,
        tone: 'success'
      }
    ];
  }

  exportDashboardCsv(): void {
    if (!this.overview || !this.aiStats) {
      return;
    }

    const rows = [
      ['Indicateur', 'Valeur'],
      ['Utilisateurs totaux', String(this.overview.totalUsers)],
      ['Candidats', String(this.overview.totalCandidates)],
      ['Recruteurs', String(this.overview.totalRecruiters)],
      ['Recruteurs en attente', String(this.pendingRecruiters)],
      ['Offres publiées', String(this.overview.totalOffers)],
      ['Candidatures', String(this.overview.totalApplications)],
      ['Tests IA passés', String(this.aiStats.completedTests)],
      ['Taux de réussite Test IA', `${this.aiStats.successRate}%`],
      ['Score moyen matching', `${this.overview.averageMatchingScore}%`]
    ];

    this.downloadCsv('admin-dashboard-summary.csv', rows);
  }

  formatActivityDate(value: string): string {
    if (!value) {
      return 'Non disponible';
    }
    return value;
  }

  private loadDashboard(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      overview: this.adminPlatformService.getOverviewStats(),
      aiStats: this.adminPlatformService.getAiTestStats(),
      subscriptions: this.adminPlatformService.getSubscriptions(),
      insights: this.adminPlatformService.getInsights(),
      serviceHealth: this.adminPlatformService.getSystemHealth(),
      recentActivity: this.adminPlatformService.getRecentActivity(),
      recruiters: this.authService.getRecruiterAccounts()
    }).subscribe({
      next: ({ overview, aiStats, subscriptions, insights, serviceHealth, recentActivity, recruiters }) => {
        this.overview = overview;
        this.aiStats = aiStats;
        this.subscriptions = subscriptions;
        this.insights = insights;
        this.serviceHealth = serviceHealth;
        this.recentActivity = recentActivity;
        this.pendingRecruiters = this.countPendingRecruiters(recruiters);
        this.alerts = this.buildAlerts(aiStats, subscriptions);
        this.loading = false;
      },
      error: (error: { message?: string }) => {
        this.loading = false;
        this.errorMessage = error.message || 'Chargement du dashboard administrateur impossible.';
      }
    });
  }

  private buildAlerts(aiStats: AiTestStatsResponse, subscriptions: AdminSubscriptionResponse[]): AlertItem[] {
    const alerts: AlertItem[] = [];
    const expiringSoonCount = subscriptions.filter((item) => this.isExpiringSoon(item.endDate)).length;

    if (this.pendingRecruiters > 0) {
      alerts.push({
        title: `${this.pendingRecruiters} recruteur(s) en attente`,
        description: 'Des comptes recruteurs attendent une validation pour publier leurs offres.',
        tone: 'warning'
      });
    }

    if (expiringSoonCount > 0) {
      alerts.push({
        title: `${expiringSoonCount} abonnement(s) à renouveler`,
        description: 'Certains plans arrivent bientôt à expiration et méritent un suivi.',
        tone: 'warning'
      });
    }

    if (aiStats.cheatingSuspicions > 0) {
      alerts.push({
        title: `${aiStats.cheatingSuspicions} suspicion(s) de triche`,
        description: 'Des tests IA ont été fermés automatiquement et nécessitent une vérification.',
        tone: 'danger'
      });
    }

    if (aiStats.failedTests > 0) {
      alerts.push({
        title: `${aiStats.failedTests} test(s) IA échoué(s)`,
        description: 'Le volume de tests échoués peut signaler un niveau trop exigeant ou un besoin d’accompagnement.',
        tone: 'neutral'
      });
    }

    if (!alerts.length) {
      alerts.push({
        title: 'Aucune alerte critique',
        description: 'La plateforme est stable et ne présente pas de point de vigilance immédiat.',
        tone: 'success'
      });
    }

    return alerts;
  }

  private countPendingRecruiters(recruiters: RegisterResult[]): number {
    return (recruiters || []).filter((item) => item?.approvalStatus === 'PENDING').length;
  }

  private isExpiringSoon(endDate: string): boolean {
    if (!endDate) {
      return false;
    }

    const date = new Date(endDate);
    if (Number.isNaN(date.getTime())) {
      return false;
    }

    const now = new Date();
    const diffDays = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 14;
  }

  private downloadCsv(filename: string, rows: string[][]): void {
    const content = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
