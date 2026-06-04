import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ApplicationService } from '../../services/application.service';
import { CandidateProfileResponse, CandidateProfileService } from '../../services/candidate-profile.service';
import { ApiMessageResponse, OfferResponse, OfferService } from '../../services/offer.service';
import { PageHeroComponent } from '../../shared/page-hero/page-hero.component';

interface TimelineItem {
  title?: string;
  degree?: string;
  institute?: string;
  year?: string;
  company?: string;
  location?: string;
  period?: string;
  description?: string;
}

interface SkillItem {
  title?: string;
  level?: string;
  yearsExperience?: string;
  percentage?: number;
}

@Component({
  selector: 'app-recruiter-candidate-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeroComponent],
  templateUrl: './recruiter-candidate-profile.component.html',
  styleUrl: './recruiter-candidate-profile.component.css'
})
export class RecruiterCandidateProfileComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly candidateProfileService = inject(CandidateProfileService);
  private readonly offerService = inject(OfferService);
  private readonly applicationService = inject(ApplicationService);

  readonly defaultProfilePhotoUrl = 'assets/img/default-candidate-profile.svg';
  readonly defaultCoverPhotoUrl = 'assets/img/default-candidate-cover.svg';

  profile: CandidateProfileResponse | null = null;
  recruiterOffers: OfferResponse[] = [];
  selectedOfferId: number | null = null;
  loading = false;
  offersLoading = false;
  inviting = false;
  invitationSent = false;
  downloadingCv = false;
  successMessage = '';
  errorMessage = '';

  ngOnInit(): void {
    const candidateId = Number(this.route.snapshot.paramMap.get('candidateId'));
    const offerId = Number(this.route.snapshot.queryParamMap.get('offerId'));
    this.selectedOfferId = Number.isFinite(offerId) && offerId > 0 ? offerId : null;

    if (!candidateId) {
      this.errorMessage = 'Profil candidat introuvable.';
      return;
    }

    this.loading = true;
    this.loadRecruiterOffers();
    this.candidateProfileService.getRecruiterCandidateProfile(candidateId).subscribe({
      next: (profile) => {
        this.profile = profile;
        this.loading = false;
      },
      error: (error: { message?: string }) => {
        this.errorMessage = error.message || 'Chargement du profil candidat impossible.';
        this.loading = false;
      }
    });
  }

  get profilePhotoUrl(): string {
    return this.profile?.profilePhotoUrl?.trim() || this.defaultProfilePhotoUrl;
  }

  get coverPhotoUrl(): string {
    return this.profile?.coverPhotoUrl?.trim() || this.defaultCoverPhotoUrl;
  }

  get experiences(): TimelineItem[] {
    return this.parseJsonArray<TimelineItem>(this.profile?.experienceJson);
  }

  get education(): TimelineItem[] {
    return this.parseJsonArray<TimelineItem>(this.profile?.educationJson);
  }

  get skills(): SkillItem[] {
    return this.parseJsonArray<SkillItem>(this.profile?.skillsJson);
  }

  get socialLinks(): Array<{ label: string; value: string; tone: 'linkedin' | 'github' | 'facebook' | 'instagram' }> {
    if (!this.profile) {
      return [];
    }

    return [
      { label: 'LinkedIn', value: this.profile.linkedin || '', tone: 'linkedin' },
      { label: 'GitHub', value: this.profile.github || '', tone: 'github' },
      { label: 'Facebook', value: this.profile.facebook || '', tone: 'facebook' },
      { label: 'Instagram', value: this.profile.instagram || '', tone: 'instagram' }
    ];
  }

  toExternalLink(value: string | null | undefined): string {
    const sanitized = (value || '').trim();
    if (!sanitized) {
      return '#';
    }

    return /^https?:\/\//i.test(sanitized) ? sanitized : `https://${sanitized}`;
  }

  inviteToApply(): void {
    if (!this.profile?.id || !this.selectedOfferId || this.invitationSent || this.inviting) {
      return;
    }

    this.inviting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.offerService.inviteCandidateToOffer(this.selectedOfferId, this.profile.id).subscribe({
      next: (response: ApiMessageResponse) => {
        this.inviting = false;
        this.invitationSent = true;
        this.successMessage = response.message || 'Invitation envoyee avec succes.';
      },
      error: (error: { message?: string }) => {
        this.inviting = false;
        this.errorMessage = error.message || "Envoi de l'invitation impossible.";
      }
    });
  }

  get canInvite(): boolean {
    return !!this.profile?.id && !!this.selectedOfferId && !this.invitationSent;
  }

  get selectedOfferTitle(): string {
    return this.recruiterOffers.find((offer) => offer.id === this.selectedOfferId)?.titre || '';
  }

  downloadCv(): void {
    if (!this.profile?.id || !this.profile.cvFileName || this.downloadingCv) {
      return;
    }

    this.downloadingCv = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.applicationService.downloadRecruiterCandidateCvByCandidateId(this.profile.id).subscribe({
      next: (fileBlob) => {
        this.downloadingCv = false;
        const objectUrl = URL.createObjectURL(fileBlob);
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = this.profile?.cvFileName || 'cv-candidat';
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      },
      error: (error: { message?: string }) => {
        this.downloadingCv = false;
        this.errorMessage = error.message || 'Telechargement du CV impossible.';
      }
    });
  }

  private parseJsonArray<T>(value?: string | null): T[] {
    if (!value?.trim()) {
      return [];
    }

    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private loadRecruiterOffers(): void {
    this.offersLoading = true;
    this.offerService.getRecruiterOffers().subscribe({
      next: (offers) => {
        this.recruiterOffers = offers;
        this.offersLoading = false;
        if (!this.selectedOfferId && offers.length) {
          this.selectedOfferId = offers[0].id;
        }
      },
      error: (error: { message?: string }) => {
        this.offersLoading = false;
        this.errorMessage = error.message || 'Chargement des offres recruteur impossible.';
      }
    });
  }
}
