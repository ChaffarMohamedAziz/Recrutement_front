import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApplicationResponse, ApplicationService } from '../../services/application.service';
import { PageHeroComponent } from '../../shared/page-hero/page-hero.component';

@Component({
  selector: 'app-candidate-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeroComponent],
  templateUrl: './candidate-list.component.html',
  styleUrl: './candidate-list.component.css'
})
export class CandidateListComponent implements OnInit {
  private readonly applicationService = inject(ApplicationService);

  applications: ApplicationResponse[] = [];
  loading = false;
  errorMessage = '';
  minScore = 0;
  selectedOfferId = 'all';

  ngOnInit(): void {
    this.loadApplications();
  }

  get offerOptions(): { value: string; label: string }[] {
    const uniqueOffers = Array.from(
      new Map(this.applications.map((item) => [item.offerId, item.offerTitle])).entries()
    );

    return [
      { value: 'all', label: 'Toutes les offres' },
      ...uniqueOffers.map(([offerId, offerTitle]) => ({ value: String(offerId), label: offerTitle }))
    ];
  }

  get filteredApplications(): ApplicationResponse[] {
    return this.applications.filter((application) => {
      const matchesScore = application.score >= this.minScore;
      const matchesOffer = this.selectedOfferId === 'all' || String(application.offerId) === this.selectedOfferId;
      return matchesScore && matchesOffer;
    });
  }

  setMinScore(event: Event): void {
    this.minScore = Number((event.target as HTMLInputElement).value);
  }

  private loadApplications(): void {
    this.loading = true;
    this.errorMessage = '';

    this.applicationService.getRecruiterApplications().subscribe({
      next: (applications) => {
        this.applications = applications;
        this.loading = false;
      },
      error: (error: { message?: string }) => {
        this.loading = false;
        this.errorMessage = error.message || 'Chargement des candidats impossible.';
      }
    });
  }
}
