import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { AuthService, RegisterResult } from '../../services/auth.service';
import { PageHeroComponent } from '../../shared/page-hero/page-hero.component';

type RecruiterApprovalStatus = 'PENDING' | 'APPROVED' | 'REFUSED' | 'SUSPENDED';
type RecruiterFilter = RecruiterApprovalStatus | 'ALL';
type RecruiterUiStatus = 'ACTIF' | 'SUSPENDU' | 'EN_ATTENTE';

@Component({
  selector: 'app-recruiter-activation',
  standalone: true,
  imports: [CommonModule, PageHeroComponent],
  templateUrl: './recruiter-activation.component.html',
  styleUrl: './recruiter-activation.component.css'
})
export class RecruiterActivationComponent implements OnInit {
  private readonly authService = inject(AuthService);

  recruiters: RegisterResult[] = [];
  loading = false;
  errorMessage = '';
  actionMessage = '';
  activeFilter: RecruiterFilter = 'PENDING';
  approvingRecruiterId: number | null = null;
  rejectingRecruiterId: number | null = null;
  deletingRecruiterId: number | null = null;
  selectedRecruiter: RegisterResult | null = null;

  ngOnInit(): void {
    this.loadRecruiters();
  }

  get pendingCount(): number {
    return this.recruiters.filter((item) => this.getApprovalStatus(item) === 'PENDING').length;
  }

  get approvedCount(): number {
    return this.recruiters.filter((item) => this.getApprovalStatus(item) === 'APPROVED').length;
  }

  get refusedCount(): number {
    return this.recruiters.filter((item) => this.getApprovalStatus(item) === 'REFUSED').length;
  }

  get filteredRecruiters(): RegisterResult[] {
    if (this.activeFilter === 'ALL') {
      return this.recruiters;
    }
    return this.recruiters.filter((item) => this.getApprovalStatus(item) === this.activeFilter);
  }

  get showPublishedOffersColumn(): boolean {
    return this.activeFilter === 'APPROVED';
  }

  setFilter(filter: RecruiterFilter): void {
    this.activeFilter = filter;
  }

  loadRecruiters(): void {
    if (this.loading) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.getRecruiterAccounts().subscribe({
      next: (items) => {
        this.loading = false;
        this.recruiters = items;
      },
      error: (error: Error) => {
        this.loading = false;
        this.errorMessage = error.message;
      }
    });
  }

  openDetails(recruiter: RegisterResult): void {
    this.selectedRecruiter = recruiter;
  }

  closeDetails(): void {
    this.selectedRecruiter = null;
  }

  approveRecruiter(recruiter: RegisterResult): void {
    if (
      !recruiter?.id ||
      this.getApprovalStatus(recruiter) === 'APPROVED' ||
      this.approvingRecruiterId !== null ||
      this.rejectingRecruiterId !== null ||
      this.deletingRecruiterId !== null
    ) {
      return;
    }

    this.actionMessage = '';
    this.errorMessage = '';
    this.approvingRecruiterId = recruiter.id;

    this.authService.approveRecruiterAccount(recruiter.id).subscribe({
      next: (response) => {
        this.approvingRecruiterId = null;
        this.actionMessage = response.message || 'Compte recruteur activé.';
        this.updateRecruiterState(recruiter.id, 'APPROVED');
      },
      error: (error: Error) => {
        this.approvingRecruiterId = null;
        this.errorMessage = error.message;
      }
    });
  }

  rejectRecruiter(recruiter: RegisterResult): void {
    if (
      !recruiter?.id ||
      this.getApprovalStatus(recruiter) !== 'PENDING' ||
      this.rejectingRecruiterId !== null ||
      this.approvingRecruiterId !== null ||
      this.deletingRecruiterId !== null
    ) {
      return;
    }

    const confirmed = window.confirm(`Refuser le compte recruteur ${recruiter.nom || ''} et envoyer un email de refus ?`);
    if (!confirmed) {
      return;
    }

    this.actionMessage = '';
    this.errorMessage = '';
    this.rejectingRecruiterId = recruiter.id;

    this.authService.rejectRecruiterAccount(recruiter.id).subscribe({
      next: (response) => {
        this.rejectingRecruiterId = null;
        this.actionMessage = response.message || 'Compte recruteur refusé. Un email a été envoyé.';
        this.updateRecruiterState(recruiter.id, 'REFUSED');
      },
      error: (error: Error) => {
        this.rejectingRecruiterId = null;
        this.errorMessage = error.message;
      }
    });
  }

  suspendRecruiter(recruiter: RegisterResult): void {
    if (
      !recruiter?.id ||
      this.deletingRecruiterId !== null ||
      this.rejectingRecruiterId !== null ||
      this.approvingRecruiterId !== null
    ) {
      return;
    }

    const confirmed = window.confirm(
      `Suspendre le compte recruteur ${recruiter.nom || ''} ? Il ne pourra plus se connecter, mais ses donnees seront conservees.`
    );
    if (!confirmed) {
      return;
    }

    this.actionMessage = '';
    this.errorMessage = '';
    this.deletingRecruiterId = recruiter.id;

    this.authService.suspendRecruiterAccount(recruiter.id).subscribe({
      next: (response) => {
        this.deletingRecruiterId = null;
        this.actionMessage = response.message || 'Compte recruteur desactive.';
        this.updateRecruiterState(recruiter.id, 'SUSPENDED');
      },
      error: (error: Error) => {
        this.deletingRecruiterId = null;
        this.errorMessage = error.message;
      }
    });
  }

  isApproving(recruiterId: number): boolean {
    return this.approvingRecruiterId === recruiterId;
  }

  isDeleting(recruiterId: number): boolean {
    return this.deletingRecruiterId === recruiterId;
  }

  isRejecting(recruiterId: number): boolean {
    return this.rejectingRecruiterId === recruiterId;
  }

  shouldShowApproveButton(recruiter: RegisterResult): boolean {
    const status = this.getApprovalStatus(recruiter);
    return status === 'PENDING' || status === 'REFUSED' || status === 'SUSPENDED';
  }

  shouldShowRejectButton(recruiter: RegisterResult): boolean {
    return this.getApprovalStatus(recruiter) === 'PENDING';
  }

  shouldShowSuspendButton(recruiter: RegisterResult): boolean {
    return this.getApprovalStatus(recruiter) === 'APPROVED';
  }

  isDeleteOnlyAction(recruiter: RegisterResult): boolean {
    return this.shouldShowSuspendButton(recruiter)
      && !this.shouldShowApproveButton(recruiter)
      && !this.shouldShowRejectButton(recruiter);
  }

  getApprovalStatus(recruiter: RegisterResult): RecruiterApprovalStatus {
    if (
      recruiter.approvalStatus === 'PENDING' ||
      recruiter.approvalStatus === 'APPROVED' ||
      recruiter.approvalStatus === 'REFUSED' ||
      recruiter.approvalStatus === 'SUSPENDED'
    ) {
      return recruiter.approvalStatus;
    }

    return recruiter.statutCompte ? 'APPROVED' : 'PENDING';
  }

  getApprovalLabel(recruiter: RegisterResult): string {
    const status = this.getApprovalStatus(recruiter);
    if (status === 'APPROVED') {
      return 'Approuvé';
    }
    if (status === 'REFUSED') {
      return 'Refusé';
    }
    if (status === 'SUSPENDED') {
      return 'Suspendu';
    }
    return 'En attente';
  }

  getRecruiterUiStatus(recruiter: RegisterResult): RecruiterUiStatus {
    const approvalStatus = this.getApprovalStatus(recruiter);
    if (approvalStatus === 'PENDING') {
      return 'EN_ATTENTE';
    }
    if (approvalStatus === 'REFUSED' || approvalStatus === 'SUSPENDED' || recruiter.statutCompte === false) {
      return 'SUSPENDU';
    }
    return 'ACTIF';
  }

  getRecruiterUiStatusLabel(recruiter: RegisterResult): string {
    return this.getRecruiterUiStatus(recruiter);
  }

  getRecruiterUiStatusClass(recruiter: RegisterResult): string {
    const status = this.getRecruiterUiStatus(recruiter);
    if (status === 'ACTIF') {
      return 'success';
    }
    if (status === 'SUSPENDU') {
      return 'danger';
    }
    return 'warning';
  }

  getRecruiterCompany(recruiter: RegisterResult): string {
    return this.recruiterValue(recruiter.entrepriseName || recruiter.entreprise || recruiter.companyName);
  }

  getRecruiterSector(recruiter: RegisterResult): string {
    return this.recruiterValue(recruiter.secteurActivite || recruiter.secteur || recruiter.activitySector);
  }

  getRecruiterRegistrationDate(recruiter: RegisterResult): string {
    const value = recruiter.dateInscription || recruiter.registrationDate || recruiter.createdAt;
    if (!value || value === 'Non disponible') {
      return 'Compte existant';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString('fr-FR');
  }

  getPublishedOffersCount(recruiter: RegisterResult): number {
    return Number(recruiter.publishedOffersCount ?? recruiter.offersCount ?? recruiter.totalOffers ?? 0);
  }

  getApprovalClass(recruiter: RegisterResult): string {
    const status = this.getApprovalStatus(recruiter);
    if (status === 'APPROVED') {
      return 'success';
    }
    if (status === 'REFUSED') {
      return 'danger';
    }
    return 'warning';
  }

  recruiterValue(value: string | number | boolean | undefined | null): string {
    if (value === null || value === undefined || value === '') {
      return 'Non disponible';
    }
    if (typeof value === 'boolean') {
      return value ? 'Oui' : 'Non';
    }
    return String(value);
  }

  private updateRecruiterState(recruiterId: number, status: RecruiterApprovalStatus): void {
    this.recruiters = this.recruiters.map((item) => {
      if (item.id !== recruiterId) {
        return item;
      }

      const updated = {
        ...item,
        approvalStatus: status,
        statutCompte: status === 'APPROVED'
      };

      if (this.selectedRecruiter?.id === recruiterId) {
        this.selectedRecruiter = updated;
      }

      return updated;
    });
  }
}
