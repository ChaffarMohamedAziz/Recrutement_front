import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminPlatformService, AdminSubscriptionPayload, AdminSubscriptionResponse } from '../../services/admin-platform.service';
import { AuthService, RegisterResult } from '../../services/auth.service';
import { PageHeroComponent } from '../../shared/page-hero/page-hero.component';

type FilterStatus = 'ALL' | 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';

interface SubscriptionFormModel {
  recruiterId: number | null;
  planType: string;
  status: string;
  startDate: string;
  endDate: string;
  maxJobOffers: number;
  maxCandidateViews: number;
  aiFeaturesEnabled: boolean;
}

@Component({
  selector: 'app-admin-subscriptions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeroComponent],
  templateUrl: './admin-subscriptions.component.html',
  styleUrl: './admin-subscriptions.component.css'
})
export class AdminSubscriptionsComponent implements OnInit {
  private readonly adminPlatformService = inject(AdminPlatformService);
  private readonly authService = inject(AuthService);

  readonly planOptions = ['FREE', 'STANDARD', 'PREMIUM'];
  readonly statusOptions = ['ACTIVE', 'EXPIRED', 'SUSPENDED'];
  readonly planHighlights = {
    FREE: ['Offres limitées', 'Accès basique', 'IA limitée'],
    STANDARD: ['Plus d’offres', 'Accès normal aux candidatures', 'Statistiques simples'],
    PREMIUM: ['Tests IA', 'Smart Interview Planner', 'Assistant IA avancé']
  };

  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';
  subscriptions: AdminSubscriptionResponse[] = [];
  recruiters: RegisterResult[] = [];
  activeFilter: FilterStatus = 'ALL';
  editingId: number | null = null;
  renewDays = 30;
  form: SubscriptionFormModel = this.createDefaultForm();

  ngOnInit(): void {
    this.loadData();
  }

  get filteredSubscriptions(): AdminSubscriptionResponse[] {
    if (this.activeFilter === 'ALL') {
      return this.subscriptions;
    }
    return this.subscriptions.filter((item) => item.status === this.activeFilter);
  }

  get activeCount(): number {
    return this.subscriptions.filter((item) => item.status === 'ACTIVE').length;
  }

  get suspendedCount(): number {
    return this.subscriptions.filter((item) => item.status === 'SUSPENDED').length;
  }

  get premiumCount(): number {
    return this.subscriptions.filter((item) => item.planType === 'PREMIUM').length;
  }

  loadData(): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.adminPlatformService.getSubscriptions().subscribe({
      next: (subscriptions) => {
        this.subscriptions = subscriptions;
        this.loading = false;
      },
      error: (error: { message?: string }) => {
        this.loading = false;
        this.errorMessage = error.message || 'Chargement des abonnements impossible.';
      }
    });

    this.authService.getRecruiterAccounts().subscribe({
      next: (recruiters) => {
        this.recruiters = recruiters.filter((item) => item.approvalStatus !== 'REFUSED');
      },
      error: () => {
        this.recruiters = [];
      }
    });
  }

  setFilter(status: FilterStatus): void {
    this.activeFilter = status;
  }

  editSubscription(item: AdminSubscriptionResponse): void {
    this.editingId = item.id;
    this.form = {
      recruiterId: item.recruiterId,
      planType: item.planType || 'FREE',
      status: item.status || 'ACTIVE',
      startDate: item.startDate || '',
      endDate: item.endDate || '',
      maxJobOffers: item.maxJobOffers ?? 1,
      maxCandidateViews: item.maxCandidateViews ?? 25,
      aiFeaturesEnabled: !!item.aiFeaturesEnabled
    };
    this.successMessage = '';
    this.errorMessage = '';
  }

  submit(): void {
    if (!this.form.recruiterId && !this.editingId) {
      this.errorMessage = 'Merci de choisir un recruteur.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    const payload: AdminSubscriptionPayload = {
      recruiterId: this.form.recruiterId,
      planType: this.form.planType,
      status: this.form.status,
      startDate: this.form.startDate,
      endDate: this.form.endDate,
      maxJobOffers: Number(this.form.maxJobOffers),
      maxCandidateViews: Number(this.form.maxCandidateViews),
      aiFeaturesEnabled: this.form.aiFeaturesEnabled
    };

    const request$ = this.editingId
      ? this.adminPlatformService.updateSubscription(this.editingId, payload)
      : this.adminPlatformService.createSubscription(payload);

    request$.subscribe({
      next: (subscription) => {
        this.saving = false;
        this.upsertSubscription(subscription);
        this.successMessage = this.editingId ? "L'abonnement a été mis à jour." : "L'abonnement a été créé.";
        this.cancelEdit();
      },
      error: (error: { message?: string }) => {
        this.saving = false;
        this.errorMessage = error.message || "Enregistrement de l'abonnement impossible.";
      }
    });
  }

  activate(item: AdminSubscriptionResponse): void {
    this.runQuickAction(() => this.adminPlatformService.activateSubscription(item.id), "L'abonnement a été activé.");
  }

  suspend(item: AdminSubscriptionResponse): void {
    this.runQuickAction(() => this.adminPlatformService.suspendSubscription(item.id), "L'abonnement a été suspendu.");
  }

  renew(item: AdminSubscriptionResponse): void {
    this.runQuickAction(() => this.adminPlatformService.renewSubscription(item.id, this.renewDays), "L'abonnement a été renouvelé.");
  }

  cancelEdit(): void {
    this.editingId = null;
    this.form = this.createDefaultForm();
  }

  usePlanPreset(planType: string): void {
    this.form.planType = planType;
    if (planType === 'FREE') {
      this.form.maxJobOffers = 1;
      this.form.maxCandidateViews = 25;
      this.form.aiFeaturesEnabled = false;
      return;
    }
    if (planType === 'STANDARD') {
      this.form.maxJobOffers = 10;
      this.form.maxCandidateViews = 250;
      this.form.aiFeaturesEnabled = false;
      return;
    }
    this.form.maxJobOffers = 100;
    this.form.maxCandidateViews = 5000;
    this.form.aiFeaturesEnabled = true;
  }

  exportSubscriptionsCsv(): void {
    const rows = [
      ['Recruteur', 'Entreprise', 'Plan', 'Statut', 'Date début', 'Date fin', 'Offres max', 'Vues max', 'IA activée']
    ];

    this.filteredSubscriptions.forEach((item) => {
      rows.push([
        item.recruiterName || 'Non disponible',
        item.entrepriseName || 'Non disponible',
        item.planType,
        item.status,
        item.startDate || '',
        item.endDate || '',
        String(item.maxJobOffers ?? 0),
        String(item.maxCandidateViews ?? 0),
        item.aiFeaturesEnabled ? 'Oui' : 'Non'
      ]);
    });

    const content = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'admin-subscriptions.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private runQuickAction(
    requestFactory: () => ReturnType<AdminPlatformService['activateSubscription']>,
    successMessage: string
  ): void {
    this.saving = true;
    this.errorMessage = '';
    requestFactory().subscribe({
      next: (subscription) => {
        this.saving = false;
        this.upsertSubscription(subscription);
        this.successMessage = successMessage;
      },
      error: (error: { message?: string }) => {
        this.saving = false;
        this.errorMessage = error.message || 'Action abonnement impossible.';
      }
    });
  }

  private upsertSubscription(subscription: AdminSubscriptionResponse): void {
    const existingIndex = this.subscriptions.findIndex((item) => item.id === subscription.id);
    if (existingIndex >= 0) {
      this.subscriptions = this.subscriptions.map((item) => item.id === subscription.id ? subscription : item);
      return;
    }
    this.subscriptions = [subscription, ...this.subscriptions];
  }

  private createDefaultForm(): SubscriptionFormModel {
    return {
      recruiterId: null,
      planType: 'FREE',
      status: 'ACTIVE',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: '',
      maxJobOffers: 1,
      maxCandidateViews: 25,
      aiFeaturesEnabled: false
    };
  }
}
