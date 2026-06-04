import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, Plugin } from 'chart.js';
import {
  AdminOverviewStatsResponse,
  AdminPlatformService,
  AdminSubscriptionResponse,
  AiInsightItem,
  AiTestStatsResponse,
  ChartDataResponse,
  ServiceHealthItem
} from '../services/admin-platform.service';
import { CsvExportService } from '../services/csv-export.service';
import { ThemeService } from '../services/theme.service';
import { PageHeroComponent } from '../shared/page-hero/page-hero.component';

interface AdminKpiCard {
  label: string;
  value: string;
  detail: string;
  tone: 'primary' | 'success' | 'warning' | 'neutral';
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
  private readonly csvExportService = inject(CsvExportService);
  private readonly themeService = inject(ThemeService);

  readonly quickLinks = [
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

  applicationsByMonthChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  offersByMonthChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  applicationsByStatusChartData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  topSkillsChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  aiTestsChartData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  subscriptionsChartData: ChartData<'bar'> = { labels: [], datasets: [] };

  lineChartOptions: ChartConfiguration<'line'>['options'] = {};
  verticalBarOptions: ChartConfiguration<'bar'>['options'] = {};
  horizontalBarOptions: ChartConfiguration<'bar'>['options'] = {};
  doughnutOptions: ChartConfiguration<'doughnut'>['options'] = {};
  horizontalBarPlugins: Plugin<'bar'>[] = [];

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

    this.csvExportService.exportToCsv('admin-statistics.csv', rows);
  }

  hasChartValues(chartData: ChartData<'line' | 'bar' | 'doughnut'>): boolean {
    return chartData.datasets.some((dataset) => (dataset.data as number[]).some((value) => this.toSafeNumber(value) > 0));
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
    const applicationsMonthly = this.normalizeChartData(applicationsByMonth);
    const offersMonthly = this.normalizeChartData(offersByMonth);
    const statusDistribution = this.normalizeChartData(applicationsByStatus);
    const topSkillsDistribution = this.normalizeTopSkills(topSkills);
    const aiTestDistribution = [
      this.toSafeNumber(aiStats.passedTests),
      this.toSafeNumber(aiStats.failedTests),
      this.toSafeNumber(aiStats.expiredTests),
      this.toSafeNumber(aiStats.cheatingSuspicions)
    ];
    const subscriptionDistribution = this.buildSubscriptionDistribution(subscriptions);

    this.applicationsByMonthChartData = {
      labels: applicationsMonthly.labels,
      datasets: [{
        data: applicationsMonthly.values,
        label: 'Candidatures',
        backgroundColor: palette.info,
        borderColor: palette.primary,
        borderWidth: 1,
        borderRadius: 12,
        borderSkipped: false,
        maxBarThickness: 46
      }]
    };

    this.offersByMonthChartData = {
      labels: offersMonthly.labels,
      datasets: [{
        data: offersMonthly.values,
        label: 'Offres',
        backgroundColor: palette.primary,
        borderRadius: 12,
        borderSkipped: false
      }]
    };

    this.applicationsByStatusChartData = {
      labels: statusDistribution.labels,
      datasets: [{
        data: statusDistribution.values,
        backgroundColor: [palette.info, palette.primary, palette.success, palette.danger, palette.good, palette.warning, palette.accent]
      }]
    };

    this.topSkillsChartData = {
      labels: topSkillsDistribution.labels,
      datasets: [{
        data: topSkillsDistribution.values,
        label: 'Compétences',
        backgroundColor: palette.primary,
        borderRadius: 10,
        borderSkipped: false
      }]
    };

    this.aiTestsChartData = {
      labels: ['Réussis', 'Échoués', 'Expirés', 'Suspicions'],
      datasets: [{
        data: aiTestDistribution,
        backgroundColor: [palette.success, palette.danger, palette.warning, palette.accent]
      }]
    };

    this.subscriptionsChartData = {
      labels: ['FREE', 'STANDARD', 'PREMIUM'],
      datasets: [{
        data: subscriptionDistribution,
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
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: { color: palette.text, usePointStyle: true, padding: 16 }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: palette.textMuted } },
        y: { beginAtZero: true, ticks: { color: palette.textMuted, precision: 0, stepSize: 1 }, grid: { color: palette.grid } }
      }
    };

    this.verticalBarOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: { color: palette.text, usePointStyle: true, padding: 16 }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: palette.textMuted } },
        y: { beginAtZero: true, ticks: { color: palette.textMuted, precision: 0, stepSize: 1 }, grid: { color: palette.grid } }
      }
    };

    this.horizontalBarOptions = {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      layout: {
        padding: { right: 34 }
      },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: { color: palette.text, usePointStyle: true, padding: 16 }
        }
      },
      scales: {
        x: { beginAtZero: true, ticks: { color: palette.textMuted, precision: 0, stepSize: 1 }, grid: { color: palette.grid } },
        y: { ticks: { color: palette.text }, grid: { display: false } }
      }
    };
    this.horizontalBarPlugins = [this.createHorizontalBarValuePlugin(palette)];

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

  private createHorizontalBarValuePlugin(palette: ChartPalette): Plugin<'bar'> {
    return {
      id: 'topSkillsValueLabels',
      afterDatasetsDraw: (chart) => {
        const { ctx, chartArea } = chart;
        const dataset = chart.data.datasets[0];
        const meta = chart.getDatasetMeta(0);

        ctx.save();
        ctx.fillStyle = palette.text;
        ctx.font = '700 12px Inter, Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        meta.data.forEach((bar, index) => {
          const value = Number(dataset.data[index] ?? 0);
          const position = bar.tooltipPosition(true);
          const x = Math.min(position.x + 10, chartArea.right + 8);
          ctx.fillText(`${value}`, x, position.y);
        });

        ctx.restore();
      }
    };
  }

  private normalizeChartData(source: ChartDataResponse | null | undefined): { labels: string[]; values: number[] } {
    const labels = (source?.labels || []).map((label) => this.formatChartLabel(label));
    const values = (source?.values || []).map((value) => this.toSafeNumber(value));
    const maxLength = Math.max(labels.length, values.length);

    return {
      labels: Array.from({ length: maxLength }, (_, index) => labels[index] || `Element ${index + 1}`),
      values: Array.from({ length: maxLength }, (_, index) => values[index] ?? 0)
    };
  }

  private normalizeTopSkills(topSkills: { name: string; count: number }[]): { labels: string[]; values: number[] } {
    const countBySkill = new Map<string, { label: string; count: number }>();

    for (const item of topSkills || []) {
      const label = `${item?.name || ''}`.trim();
      const key = this.normalizeKey(label);
      if (!key) {
        continue;
      }

      const current = countBySkill.get(key);
      const count = this.toSafeNumber(item?.count);
      if (current) {
        current.count += count;
      } else {
        countBySkill.set(key, { label: this.formatSkillLabel(label), count });
      }
    }

    const skills = Array.from(countBySkill.values())
      .filter((skill) => skill.count > 0)
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));

    return {
      labels: skills.map((skill) => skill.label),
      values: skills.map((skill) => skill.count)
    };
  }

  private buildSubscriptionDistribution(subscriptions: AdminSubscriptionResponse[]): number[] {
    const countPlan = (planType: string) =>
      (subscriptions || []).filter((item) => `${item.planType || ''}`.toUpperCase() === planType).length;

    return [countPlan('FREE'), countPlan('STANDARD'), countPlan('PREMIUM')];
  }

  private toSafeNumber(value: unknown): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  private normalizeKey(value: string): string {
    return `${value || ''}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '');
  }

  private formatSkillLabel(value: string): string {
    const key = this.normalizeKey(value);
    const knownLabels: Record<string, string> = {
      powerbi: 'Power BI',
      python: 'Python',
      sql: 'SQL',
      docker: 'Docker',
      springboot: 'Spring Boot',
      angular: 'Angular',
      postgresql: 'PostgreSQL',
      postgres: 'PostgreSQL'
    };

    return knownLabels[key] || value;
  }

  private formatChartLabel(label: string): string {
    const value = `${label || ''}`.trim();
    const monthMatch = value.match(/^(\d{4})-(\d{1,2})$/);
    if (monthMatch) {
      const date = new Date(Number(monthMatch[1]), Number(monthMatch[2]) - 1, 1);
      return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    }

    return value || 'Non disponible';
  }
}
