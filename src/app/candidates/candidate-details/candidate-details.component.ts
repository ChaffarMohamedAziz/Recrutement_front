import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AiTestResponse, AiTestService } from '../../services/ai-test.service';
import { ApplicationResponse, ApplicationService } from '../../services/application.service';
import { PageHeroComponent } from '../../shared/page-hero/page-hero.component';

@Component({
  selector: 'app-candidate-details',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeroComponent],
  templateUrl: './candidate-details.component.html',
  styleUrl: './candidate-details.component.css'
})
export class CandidateDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly applicationService = inject(ApplicationService);
  private readonly aiTestService = inject(AiTestService);
  readonly defaultProfilePhotoUrl = 'assets/img/default-candidate-profile.svg';
  readonly defaultCoverPhotoUrl = 'assets/img/default-candidate-cover.svg';

  application: ApplicationResponse | null = null;
  aiTestResult: AiTestResponse | null = null;
  errorMessage = '';
  successMessage = '';
  loading = false;
  downloadingCv = false;
  aiTestLoading = false;
  validatingRejection = false;
  rejectionEmailDraft = '';

  ngOnInit(): void {
    const applicationId = Number(this.route.snapshot.paramMap.get('id'));
    if (!applicationId) {
      this.errorMessage = 'Candidature introuvable.';
      return;
    }

    this.loading = true;
    this.applicationService.getRecruiterApplicationById(applicationId).subscribe({
      next: (application) => {
        this.application = application;
        this.loading = false;
        if (application.aiTestId) {
          this.loadAiTestResult(application.aiTestId);
        }
      },
      error: (error: { message?: string }) => {
        this.errorMessage = error.message || 'Chargement du profil candidat impossible.';
        this.loading = false;
      }
    });
  }

  downloadCv(): void {
    if (!this.application?.id || !this.application.candidateCvFileName || this.downloadingCv) {
      return;
    }

    this.downloadingCv = true;
    this.errorMessage = '';

    this.applicationService.downloadRecruiterCandidateCv(this.application.id).subscribe({
      next: (fileBlob) => {
        this.downloadingCv = false;
        const objectUrl = URL.createObjectURL(fileBlob);
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = this.application?.candidateCvFileName || 'cv-candidat';
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      },
      error: (error: { message?: string }) => {
        this.downloadingCv = false;
        this.errorMessage = error.message || 'Telechargement du CV impossible.';
      }
    });
  }

  approveAiRejection(): void {
    if (!this.application?.id || !this.canApproveAiRejection || this.validatingRejection) {
      return;
    }

    this.validatingRejection = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.aiTestService.rejectAfterAiTest(this.application.id, {
      emailBody: (this.rejectionEmailDraft || '').trim()
    }).subscribe({
      next: (response) => {
        this.validatingRejection = false;
        this.successMessage = response.message || 'Le refus a ete valide.';
        if (this.application) {
          this.application = { ...this.application, status: 'REJECTED' };
        }
      },
      error: (error: { message?: string }) => {
        this.validatingRejection = false;
        this.errorMessage = error.message || 'Validation du refus impossible.';
      }
    });
  }

  toExternalLink(value: string | null | undefined): string {
    const sanitized = (value || '').trim();
    if (!sanitized) {
      return '#';
    }

    return /^https?:\/\//i.test(sanitized) ? sanitized : `https://${sanitized}`;
  }

  get profilePhotoUrl(): string {
    return this.application?.candidateProfilePhotoUrl?.trim() || this.defaultProfilePhotoUrl;
  }

  get coverPhotoUrl(): string {
    return this.application?.candidateCoverPhotoUrl?.trim() || this.defaultCoverPhotoUrl;
  }

  get hasCv(): boolean {
    return !!this.application?.candidateCvFileName?.trim();
  }

  get hasAiReport(): boolean {
    return !!this.aiTestResult;
  }

  get canApproveAiRejection(): boolean {
    return this.application?.status === 'REJECTION_SUGGESTED' && !!this.aiTestResult;
  }

  get socialLinks(): Array<{ label: string; value: string; tone: 'linkedin' | 'github' | 'facebook' | 'instagram' }> {
    if (!this.application) {
      return [];
    }

    return [
      { label: 'LinkedIn', value: this.application.candidateLinkedinUrl || '', tone: 'linkedin' },
      { label: 'GitHub', value: this.application.candidateGithubUrl || '', tone: 'github' },
      { label: 'Facebook', value: this.application.candidateFacebookUrl || '', tone: 'facebook' },
      { label: 'Instagram', value: this.application.candidateInstagramUrl || '', tone: 'instagram' }
    ];
  }

  private loadAiTestResult(testId: number): void {
    this.aiTestLoading = true;

    this.aiTestService.getRecruiterAiTestResult(testId).subscribe({
      next: (result) => {
        this.aiTestLoading = false;
        this.aiTestResult = result;
        this.rejectionEmailDraft = result.proposedRejectionEmail || '';
      },
      error: (error: { message?: string }) => {
        this.aiTestLoading = false;
        this.errorMessage = error.message || 'Chargement du rapport IA impossible.';
      }
    });
  }
}
