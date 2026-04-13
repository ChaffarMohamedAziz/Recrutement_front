import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CANDIDATES, COMPANIES } from '../data/mock-market-data';
import { PageHeroComponent } from '../shared/page-hero/page-hero.component';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeroComponent],
  templateUrl: './about.component.html',
  styleUrl: './about.component.css'
})
export class AboutComponent {
  readonly stats = [
    { value: '14k+', label: 'Offres publiees' },
    { value: '9k+', label: 'Entreprises actives' },
    { value: '18k+', label: 'CV analyses' }
  ];

  readonly values = [
    {
      title: 'Recrutement structure',
      description: 'Nous organisons les candidatures, les profils et les offres dans une interface lisible et rapide.'
    },
    {
      title: 'Experience fluide',
      description: 'Les candidats trouvent rapidement les bonnes offres et les recruteurs gagnent du temps sur la selection.'
    },
    {
      title: 'Suivi professionnel',
      description: 'Chaque etape du parcours est pensee pour offrir un suivi clair et une meilleure collaboration.'
    }
  ];

  readonly featuredCompanies = COMPANIES.slice(0, 2);
  readonly featuredCandidates = CANDIDATES.slice(0, 2);
}
