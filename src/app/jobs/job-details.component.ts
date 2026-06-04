import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApplicationService } from '../services/application.service';
import { AuthService } from '../services/auth.service';
import { CandidateProfileService, CandidateSkillItem } from '../services/candidate-profile.service';
import { OfferResponse, OfferSkillRequirement, OfferService } from '../services/offer.service';
import { PageHeroComponent } from '../shared/page-hero/page-hero.component';

interface OfferSkillDisplay extends OfferSkillRequirement {
  matched: boolean;
}

@Component({
  selector: 'app-job-details',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeroComponent],
  templateUrl: './job-details.component.html',
  styleUrl: './job-details.component.css'
})
export class JobDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly offerService = inject(OfferService);
  private readonly applicationService = inject(ApplicationService);
  private readonly candidateProfileService = inject(CandidateProfileService);
  private readonly authService = inject(AuthService);

  offer: OfferResponse | null = null;
  loading = false;
  errorMessage = '';
  applyMessage = '';
  applying = false;
  private candidateSkillNames = new Set<string>();

  ngOnInit(): void {
    const offerId = Number(this.route.snapshot.paramMap.get('id'));
    if (!offerId) {
      this.errorMessage = 'Offre introuvable.';
      return;
    }

    this.loading = true;

    if (!this.authService.isLoggedIn() || !this.authService.isCandidate()) {
      this.candidateSkillNames = new Set<string>();
      this.loadOffer(offerId);
      return;
    }

    this.candidateProfileService.getCurrentProfile().subscribe({
      next: (profile) => {
        this.candidateSkillNames = new Set(
          this.parseSkillItems(profile.skillsJson)
            .map((item) => (item.title || '').trim().toLowerCase())
            .filter(Boolean)
        );
        this.loadOffer(offerId);
      },
      error: () => {
        this.candidateSkillNames = new Set<string>();
        this.loadOffer(offerId);
      }
    });
  }

  get requiredSkills(): OfferSkillDisplay[] {
    return this.mapSkillsByType('OBLIGATOIRE');
  }

  get desiredSkills(): OfferSkillDisplay[] {
    return this.mapSkillsByType('SOUHAITEE');
  }

  get compatibilityScore(): number {
    return Math.max(0, Math.min(100, Math.round(this.offer?.compatibilityScore ?? this.computeFallbackScore())));
  }

  get matchedRequiredCount(): number {
    return this.requiredSkills.filter((skill) => skill.matched).length;
  }

  get matchedDesiredCount(): number {
    return this.desiredSkills.filter((skill) => skill.matched).length;
  }

  apply(): void {
    if (!this.offer || this.offer.alreadyApplied || this.applying) {
      return;
    }

    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { redirectTo: `/job-details/${this.offer.id}` } });
      return;
    }

    if (!this.authService.isCandidate()) {
      this.errorMessage = 'Connectez-vous avec un compte candidat pour postuler.';
      return;
    }

    this.applying = true;
    this.errorMessage = '';
    this.applyMessage = '';

    this.applicationService.applyToOffer(this.offer.id).subscribe({
      next: (application) => {
        if (!this.offer) {
          return;
        }

        this.offer = {
          ...this.offer,
          alreadyApplied: true,
          applicationStatus: application.status,
          compatibilityScore: application.score
        };
        this.applyMessage = 'Votre candidature a bien ete envoyee. Le score final de compatibilite a ete enregistre.';
        this.applying = false;
      },
      error: (error: { message?: string }) => {
        this.errorMessage = error.message || 'Postulation impossible.';
        this.applying = false;
      }
    });
  }

  private loadOffer(offerId: number): void {
    this.offerService.getOfferById(offerId).subscribe({
      next: (offer) => {
        this.offer = offer;
        this.loading = false;
      },
      error: (error: { message?: string }) => {
        this.errorMessage = error.message || 'Chargement du detail de l offre impossible.';
        this.loading = false;
      }
    });
  }

  private mapSkillsByType(type: 'OBLIGATOIRE' | 'SOUHAITEE'): OfferSkillDisplay[] {
    return (this.offer?.competences || [])
      .filter((skill) => (skill.type || 'OBLIGATOIRE') === type)
      .map((skill) => ({
        ...skill,
        matched: this.candidateSkillNames.has((skill.nom || '').trim().toLowerCase())
      }));
  }

  private computeFallbackScore(): number {
    const requiredSkills = this.requiredSkills;
    const desiredSkills = this.desiredSkills;
    const requiredTotal = requiredSkills.length;
    const desiredTotal = desiredSkills.length;
    const matchedRequired = requiredSkills.filter((skill) => skill.matched).length;
    const matchedDesired = desiredSkills.filter((skill) => skill.matched).length;

    if (!requiredTotal && !desiredTotal) {
      return 0;
    }

    const requiredScore = requiredTotal ? (matchedRequired / requiredTotal) * 80 : 0;
    const desiredScore = desiredTotal ? (matchedDesired / desiredTotal) * 20 : 0;
    return Math.round(requiredScore + desiredScore);
  }

  private parseSkillItems(value: string): CandidateSkillItem[] {
    if (!value) {
      return [];
    }

    try {
      const parsed = JSON.parse(value) as CandidateSkillItem[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
