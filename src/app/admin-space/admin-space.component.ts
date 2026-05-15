import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import {
  AdminOverviewStatsResponse,
  AdminPlatformService,
  AdminSubscriptionResponse,
  AiInsightItem,
  AiTestStatsResponse,
  ChartDataResponse,
  ServiceHealthItem
} from '../services/admin-platform.service';
import { ThemeService } from '../services/theme.service';
import { PageHeroComponent } from '../shared/page-hero/page-hero.component';

interface AdminKpiCard {
  label: string;
  value: string;
  detail: string;
  tone: 'primary' | 'success' | 'warning' | 'neutral';
}

interface QuickLink {
  title: string;
  description: string;
  link: string;
  label: string;
}

interface ChartPalette {
  primary: string;
  primarySoft: string;
  success: string;
  warning: string;
  danger: string;
  accent: string;
  good: string;
  info: string;
  mutedBar: string;
  text: string;
  textMuted: string;
  grid: string;
  surface: string;
}

@Component({
  selector: 'app-admin-space',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeroComponent, BaseChartDirective],
  templateUrl: './admin-space.component.html',
  styleUrl: './admin-space.component.css'
})
export class AdminSpaceComponent implements OnInit {
  private readonly adminPlatformService = inject(AdminPlatformService);
  private readonly themeService = inject(ThemeService);

  readonly quickLinks: QuickLink[] = [
    {
      title: 'Abonnements',
      description: 'Pilotez les plans des recruteurs et ajustez leurs droits métier.',
      link: '/admin/subscriptions',
      label: 'Ouvrir'
    },
    {
      title: 'Demandes recruteurs',
      description: 'Validez ou refusez les comptes en attente depuis une vue dédiée.',
      link: '/admin/recruiter-activation',
      label: 'Traiter'
    },
    {
      title: 'Utilisateurs',
      description: 'Consultez les comptes et leur statut dans un tableau modernisé.',
      link: '/admin/users',
      label: 'Voir'
    },
    {
      title: 'Tags compétences',
      description: 'Maintenez un référentiel propre pour le matching et les offres.',
      link: '/admin/tags',
      label: 'Gérer'
    }
  ];

  loading = false;
  errorMessage = '';
  overview: AdminOverviewStatsResponse | null = null;
  aiTestStats: AiTestStatsResponse | null = null;
  insights: AiInsightItem[] = [];
  serviceHealth: ServiceHealthItem[] = [];
  subscriptions: AdminSubscriptionResponse[] = [];
  kpis: AdminKpiCard[] = [];

  applicationsByMonthChartData: ChartData<'line'> = { labels: [], datasets: [] };
  offersByMonthChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  applicationsByStatusChartData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  topSkillsChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  aiTestsChartData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  subscriptionsChartData: ChartData<'bar'> = { labels: [], datasets: [] };

  lineChartOptions: ChartConfiguration<'line'>['options'] = {};
  verticalBarOptions: ChartConfiguration<'bar'>['options'] = {};
  horizontalBarOptions: ChartConfiguration<'bar'>['options'] = {};
  doughnutOptions: ChartConfiguration<'doughnut'>['options'] = {};

  private lastApplicationsByStatus: ChartDataResponse = { title: '', labels: [], values: [] };
  private lastOffersByMonth: ChartDataResponse = { title: '', labels: [], values: [] };
  private lastApplicationsByMonth: ChartDataResponse = { title: '', labels: [], values: [] };
  private lastTopSkills: { name: string; count: number }[] = [];

  ngOnInit(): void {
    this.applyChartTheme();
    this.themeService.currentTheme$.subscribe(() => {
      this.applyChartTheme();
      if (this.overview && this.aiTestStats) {
        this.buildCharts(
          this.lastApplicationsByMonth,
          this.lastOffersByMonth,
          this.lastApplicationsByStatus,
          this.lastTopSkills,
          this.aiTestStats,
          this.subscriptions
        );
      }
    });
    this.loadStatistics();
  }

  exportStatisticsCsv(): void {
    if (!this.overview || !this.aiTestStats) {
      return;
    }

    const rows = [
      ['Indicateur', 'Valeur'],
      ['Utilisateurs totaux', String(this.overview.totalUsers)],
      ['Candidats', String(this.overview.totalCandidates)],
      ['Recruteurs', String(this.overview.totalRecruiters)],
      ['Offres publiées', String(this.overview.totalOffers)],
      ['Candidatures', String(this.overview.totalApplications)],
      ['Entretiens planifiés', String(this.overview.totalPlannedInterviews)],
      ['Tests IA terminés', String(this.aiTestStats.completedTests)],
      ['Taux de réussite Test IA', `${this.aiTestStats.successRate}%`],
      ['Score moyen matching', `${this.overview.averageMatchingScore}%`]
    ];

    const content = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'admin-statistics.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private loadStatistics(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      overview: this.adminPlatformService.getOverviewStats(),
      aiTests: this.adminPlatformService.getAiTestStats(),
      applicationsByStatus: this.adminPlatformService.getApplicationsByStatus(),
      offersByMonth: this.adminPlatformService.getOffersByMonth(),
      applicationsByMonth: this.adminPlatformService.getApplicationsByMonth(),
      topSkills: this.adminPlatformService.getTopSkills(),
      insights: this.adminPlatformService.getInsights(),
      serviceHealth: this.adminPlatformService.getSystemHealth(),
      subscriptions: this.adminPlatformService.getSubscriptions()
    }).subscribe({
      next: ({ overview, aiTests, applicationsByStatus, offersByMonth, applicationsByMonth, topSkills, insights, serviceHealth, subscriptions }) => {
        this.overview = overview;
        this.aiTestStats = aiTests;
        this.insights = insights;
        this.serviceHealth = serviceHealth;
        this.subscriptions = subscriptions;
        this.lastApplicationsByMonth = applicationsByMonth;
        this.lastOffersByMonth = offersByMonth;
        this.lastApplicationsByStatus = applicationsByStatus;
        this.lastTopSkills = topSkills;
        this.kpis = this.buildKpis(overview, aiTests);
        this.buildCharts(applicationsByMonth, offersByMonth, applicationsByStatus, topSkills, aiTests, subscriptions);
        this.loading = false;
      },
      error: (error: { message?: string }) => {
        this.loading = false;
        this.errorMessage = error.message || 'Chargement des statistiques administrateur impossible.';
      }
    });
  }

  private buildKpis(overview: AdminOverviewStatsResponse, aiStats: AiTestStatsResponse): AdminKpiCard[] {
    return [
      {
        label: 'Utilisateurs totaux',
        value: String(overview.totalUsers),
        detail: `${overview.totalCandidates} candidats et ${overview.totalRecruiters} recruteurs`,
        tone: 'primary'
      },
      {
        label: 'Offres publiées',
        value: String(overview.totalOffers),
        detail: `${overview.totalApplications} candidatures reçues au total`,
        tone: 'neutral'
      },
      {
        label: 'Entretiens planifiés',
        value: String(overview.totalPlannedInterviews),
        detail: `${overview.totalRetainedCandidates} candidats retenus actuellement`,
        tone: 'success'
      },
      {
        label: 'Tests IA passés',
        value: String(aiStats.completedTests),
        detail: `${aiStats.successRate}% de réussite • ${aiStats.cheatingSuspicions} suspicion(s)`,
        tone: 'warning'
      }
    ];
  }

  private buildCharts(
    applicationsByMonth: ChartDataResponse,
    offersByMonth: ChartDataResponse,
    applicationsByStatus: ChartDataResponse,
    topSkills: { name: string; count: number }[],
    aiStats: AiTestStatsResponse,
    subscriptions: AdminSubscriptionResponse[]
  ): void {
    const palette = this.resolveChartPalette();

    this.applicationsByMonthChartData = {
      labels: applicationsByMonth?.labels || [],
      datasets: [{
        data: applicationsByMonth?.values || [],
        label: 'Candidatures',
        borderColor: palette.primary,
        backgroundColor: palette.primarySoft,
        pointBackgroundColor: palette.primary,
        pointBorderColor: palette.surface,
        pointRadius: 4,
        fill: true,
        tension: 0.35
      }]
    };

    this.offersByMonthChartData = {
      labels: offersByMonth?.labels || [],
      datasets: [{
        data: offersByMonth?.values || [],
        label: 'Offres',
        backgroundColor: palette.primary,
        borderRadius: 12,
        borderSkipped: false
      }]
    };

    this.applicationsByStatusChartData = {
      labels: applicationsByStatus?.labels || [],
      datasets: [{
        data: applicationsByStatus?.values || [],
        backgroundColor: [palette.info, palette.primary, palette.success, palette.danger, palette.good, palette.warning, palette.accent]
      }]
    };

    this.topSkillsChartData = {
      labels: topSkills.map((item) => item.name),
      datasets: [{
        data: topSkills.map((item) => item.count),
        label: 'Compétences',
        backgroundColor: palette.primary,
        borderRadius: 10,
        borderSkipped: false
      }]
    };

    this.aiTestsChartData = {
      labels: ['Réussis', 'Échoués', 'Expirés', 'Suspicions'],
      datasets: [{
        data: [aiStats.passedTests, aiStats.failedTests, aiStats.expiredTests, aiStats.cheatingSuspicions],
        backgroundColor: [palette.success, palette.danger, palette.warning, palette.accent]
      }]
    };

    this.subscriptionsChartData = {
      labels: ['FREE', 'STANDARD', 'PREMIUM'],
      datasets: [{
        data: [
          subscriptions.filter((item) => item.planType === 'FREE').length,
          subscriptions.filter((item) => item.planType === 'STANDARD').length,
          subscriptions.filter((item) => item.planType === 'PREMIUM').length
        ],
        label: 'Abonnements',
        backgroundColor: [palette.mutedBar, palette.info, palette.accent],
        borderRadius: 12,
        borderSkipped: false
      }]
    };
  }

  private applyChartTheme(): void {
    const palette = this.resolveChartPalette();

    this.lineChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: palette.textMuted } },
        y: { beginAtZero: true, ticks: { color: palette.textMuted, precision: 0 }, grid: { color: palette.grid } }
      }
    };

    this.verticalBarOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: palette.textMuted } },
        y: { beginAtZero: true, ticks: { color: palette.textMuted, precision: 0 }, grid: { color: palette.grid } }
      }
    };

    this.horizontalBarOptions = {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, ticks: { color: palette.textMuted, precision: 0 }, grid: { color: palette.grid } },
        y: { ticks: { color: palette.text }, grid: { display: false } }
      }
    };

    this.doughnutOptions = {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: palette.text, usePointStyle: true, padding: 18 }
        }
      }
    };
  }

  private resolveChartPalette(): ChartPalette {
    const style = getComputedStyle(document.body);
    return {
      primary: '#2563eb',
      primarySoft: 'rgba(37, 99, 235, 0.14)',
      success: '#34d399',
      warning: '#fbbf24',
      danger: '#f87171',
      accent: '#8b5cf6',
      good: '#86efac',
      info: '#60a5fa',
      mutedBar: '#cbd5e1',
      text: style.getPropertyValue('--sr-text').trim() || '#0f172a',
      textMuted: style.getPropertyValue('--sr-text-muted').trim() || '#64748b',
      grid: 'rgba(148,163,184,0.16)',
      surface: style.getPropertyValue('--sr-surface-strong').trim() || '#ffffff'
    };
  }
}
