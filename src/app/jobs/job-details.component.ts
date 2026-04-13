import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ApplicationService } from '../services/application.service';
import { OfferResponse, OfferService } from '../services/offer.service';
import { PageHeroComponent } from '../shared/page-hero/page-hero.component';

@Component({
  selector: 'app-job-details',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeroComponent],
  templateUrl: './job-details.component.html',
  styleUrl: './job-details.component.css'
})
export class JobDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly offerService = inject(OfferService);
  private readonly applicationService = inject(ApplicationService);

  offer: OfferResponse | null = null;
  loading = false;
  errorMessage = '';
  applyMessage = '';
  applying = false;

  ngOnInit(): void {
    const offerId = Number(this.route.snapshot.paramMap.get('id'));
    if (!offerId) {
      this.errorMessage = 'Offre introuvable.';
      return;
    }

    this.loading = true;
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

  apply(): void {
    if (!this.offer || this.offer.alreadyApplied || this.applying) {
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
          applicationStatus: application.status
        };
        this.applyMessage = 'Votre candidature a bien ete envoyee.';
        this.applying = false;
      },
      error: (error: { message?: string }) => {
        this.errorMessage = error.message || 'Postulation impossible.';
        this.applying = false;
      }
    });
  }
}
