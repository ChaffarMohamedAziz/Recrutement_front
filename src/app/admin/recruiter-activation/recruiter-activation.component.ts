import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService, RegisterResult } from '../../services/auth.service';

type RecruiterFilter = 'PENDING' | 'APPROVED' | 'REFUSED' | 'ALL';

@Component({
  selector: 'app-recruiter-activation',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './recruiter-activation.component.html',
  styleUrl: './recruiter-activation.component.css'
})
export class RecruiterActivationComponent implements OnInit {
  private readonly authService = inject(AuthService);

  readonly user = this.authService.getCurrentUser();
  recruiters: RegisterResult[] = [];
  loading = false;
  errorMessage = '';
  actionMessage = '';
  activeFilter: RecruiterFilter = 'PENDING';
  approvingRecruiterId: number | null = null;
  rejectingRecruiterId: number | null = null;
  deletingRecruiterId: number | null = null;

  ngOnInit(): void {
    this.loadRecruiters();
  }

  get userInitials(): string {
    const name = this.user?.username || 'Admin';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((item) => item.charAt(0).toUpperCase())
      .join('');
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
    if (this.activeFilter === 'APPROVED') {
      return this.recruiters.filter((item) => this.getApprovalStatus(item) === 'APPROVED');
    }

    if (this.activeFilter === 'REFUSED') {
      return this.recruiters.filter((item) => this.getApprovalStatus(item) === 'REFUSED');
    }

    if (this.activeFilter === 'PENDING') {
      return this.recruiters.filter((item) => this.getApprovalStatus(item) === 'PENDING');
    }

    return this.recruiters;
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
        this.actionMessage = response.message || 'Compte recruteur active.';
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
        this.actionMessage = response.message || 'Compte recruteur refuse. Un email a ete envoye.';
        this.updateRecruiterState(recruiter.id, 'REFUSED');
      },
      error: (error: Error) => {
        this.rejectingRecruiterId = null;
        this.errorMessage = error.message;
      }
    });
  }

  deleteRecruiter(recruiter: RegisterResult): void {
    if (
      !recruiter?.id ||
      this.deletingRecruiterId !== null ||
      this.rejectingRecruiterId !== null ||
      this.approvingRecruiterId !== null
    ) {
      return;
    }

    const confirmed = window.confirm(`Supprimer definitivement le compte recruteur ${recruiter.nom || ''} ?`);
    if (!confirmed) {
      return;
    }

    this.actionMessage = '';
    this.errorMessage = '';
    this.deletingRecruiterId = recruiter.id;

    this.authService.deleteRecruiterAccount(recruiter.id).subscribe({
      next: (response) => {
        this.deletingRecruiterId = null;
        this.actionMessage = response.message || 'Compte recruteur supprime.';
        this.recruiters = this.recruiters.filter((item) => item.id !== recruiter.id);
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
    return status === 'PENDING' || status === 'REFUSED';
  }

  shouldShowRejectButton(recruiter: RegisterResult): boolean {
    return this.getApprovalStatus(recruiter) === 'PENDING';
  }

  shouldShowDeleteButton(recruiter: RegisterResult): boolean {
    return this.activeFilter === 'APPROVED' && this.getApprovalStatus(recruiter) === 'APPROVED';
  }

  isDeleteOnlyAction(recruiter: RegisterResult): boolean {
    return this.shouldShowDeleteButton(recruiter)
      && !this.shouldShowApproveButton(recruiter)
      && !this.shouldShowRejectButton(recruiter);
  }

  getApprovalStatus(recruiter: RegisterResult): 'PENDING' | 'APPROVED' | 'REFUSED' {
    if (recruiter.approvalStatus === 'PENDING' || recruiter.approvalStatus === 'APPROVED' || recruiter.approvalStatus === 'REFUSED') {
      return recruiter.approvalStatus;
    }

    return recruiter.statutCompte ? 'APPROVED' : 'PENDING';
  }

  getApprovalLabel(recruiter: RegisterResult): string {
    const status = this.getApprovalStatus(recruiter);
    if (status === 'APPROVED') {
      return 'Actif';
    }
    if (status === 'REFUSED') {
      return 'Refuse';
    }
    return 'En attente';
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

  private updateRecruiterState(recruiterId: number, status: 'APPROVED' | 'REFUSED'): void {
    this.recruiters = this.recruiters.map((item) => {
      if (item.id !== recruiterId) {
        return item;
      }

      return {
        ...item,
        approvalStatus: status,
        statutCompte: status === 'APPROVED'
      };
    });
  }
}
