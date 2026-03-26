import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService, RegisterResult } from '../services/auth.service';
import { BLOG_POSTS, CANDIDATES, COMPANIES, JOB_CATEGORIES, JOBS } from '../data/mock-market-data';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  registration: RegisterResult | null;
  jobTitleQuery = '';
  locationQuery = '';
  selectedCategory = 'Toutes les categories';

  readonly categories = JOB_CATEGORIES;
  readonly companies = COMPANIES;
  readonly candidates = CANDIDATES;
  readonly blogs = BLOG_POSTS;
  readonly allJobs = JOBS;
  readonly heroStats = [
    { value: '14k+', label: 'Jobs disponibles' },
    { value: '9k+', label: 'Entreprises actives' },
    { value: '35+', label: 'Profils recrutes' }
  ];
  readonly accountSteps = [
    {
      index: '01',
      title: 'Inscrivez votre compte',
      description: 'Creez votre espace candidat ou recruteur pour acceder aux outils de la plateforme.'
    },
    {
      index: '02',
      title: 'Ajoutez votre CV',
      description: 'Mettez en avant votre parcours, vos competences et vos disponibilites en quelques clics.'
    },
    {
      index: '03',
      title: 'Postulez intelligemment',
      description: 'Recherchez les offres pertinentes et suivez chaque etape de candidature.'
    }
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.registration = this.authService.getLastRegistration();
  }

  get filteredJobs() {
    return this.allJobs.filter((job) => {
      const matchTitle = !this.jobTitleQuery || job.title.toLowerCase().includes(this.jobTitleQuery.toLowerCase());
      const matchLocation = !this.locationQuery || job.location.toLowerCase().includes(this.locationQuery.toLowerCase());
      const matchCategory = this.selectedCategory === 'Toutes les categories' || job.category === this.selectedCategory;
      return matchTitle && matchLocation && matchCategory;
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
  }

  searchJobs(): void {
    const jobsSection = document.getElementById('jobs-section');
    jobsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
