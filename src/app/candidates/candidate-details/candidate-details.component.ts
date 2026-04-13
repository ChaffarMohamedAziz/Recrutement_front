import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ApplicationResponse, ApplicationService } from '../../services/application.service';
import { PageHeroComponent } from '../../shared/page-hero/page-hero.component';

@Component({
  selector: 'app-candidate-details',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeroComponent],
  templateUrl: './candidate-details.component.html',
  styleUrl: './candidate-details.component.css'
})
export class CandidateDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly applicationService = inject(ApplicationService);

  application: ApplicationResponse | null = null;
  errorMessage = '';
  loading = false;

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
      },
      error: (error: { message?: string }) => {
        this.errorMessage = error.message || 'Chargement du profil candidat impossible.';
        this.loading = false;
      }
    });
  }
}
