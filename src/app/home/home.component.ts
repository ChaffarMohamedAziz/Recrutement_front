import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService, RegisterResult } from '../services/auth.service';
import { BLOG_POSTS, CANDIDATES, COMPANIES, JOB_CATEGORIES } from '../data/mock-market-data';
import { OfferResponse, OfferService } from '../services/offer.service';

interface HomeJobItem {
  id: number;
  title: string;
  category: string;
  contractType: string;
  companyName: string;
  location: string;
  summary: string;
  salary: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  registration: RegisterResult | null;
  jobTitleQuery = '';
  locationQuery = '';
  selectedCategory = 'Toutes les categories';
  loadingJobs = false;
  jobsError = '';
  filteredJobsList: HomeJobItem[] = [];
  allJobs: HomeJobItem[] = [];
  profileActionRoute = '/register';
  profileActionLabel = 'Demarrer maintenant';
  resumeActionRoute = '/login';
  resumeActionLabel = 'Se connecter';
  companiesActionRoute = '/about';
  companiesActionLabel = 'Decouvrir la plateforme';
  profilesActionRoute = '/register';
  profilesActionLabel = 'Creer un compte';

  categories = JOB_CATEGORIES.map((category) => category.title);
  readonly companies = COMPANIES;
  readonly candidates = CANDIDATES;
  readonly blogs = BLOG_POSTS;
  readonly heroStats = [
    { value: '12 min', label: 'pour qualifier une candidature avec un parcours plus clair' },
    { value: '87%', label: 'de matching moyen sur les profils les mieux alignes' },
    { value: '24/7', label: 'de pilotage sur les offres, tests IA et entretiens' }
  ];
  readonly dashboardMetrics = [
    { label: 'Offres actives', value: '1,248', trend: '+12% ce mois' },
    { label: 'Candidatures', value: '4,578', trend: '+18% ce mois' },
    { label: 'Entreprises', value: '342', trend: '+8% ce mois' }
  ];
  readonly popularSearches = ['Developpeur', 'Designer', 'Marketing', 'Commercial', 'Data'];
  readonly platformPillars = [
    {
      tag: 'Sourcing intelligent',
      title: 'Identifiez plus vite les bons profils',
      description: 'Matching, lecture des competences et priorisation des talents dans une interface plus nette.'
    },
    {
      tag: 'Workflow candidat',
      title: 'Fluidifiez chaque etape du parcours',
      description: 'Postulation, Test IA, entretien et messagerie restent connectes dans le meme tunnel.'
    },
    {
      tag: 'Pilotage SaaS',
      title: 'Donnez une vraie lecture business a votre recrutement',
      description: 'Statistiques, tags et activités pour une plateforme qui inspire confiance.'
    }
  ];
  readonly journeySteps = [
    {
      step: '01',
      title: 'Attirez les bons talents',
      description: 'Diffusez vos offres avec un cadrage plus clair et une promesse employeur mieux presentee.'
    },
    {
      step: '02',
      title: 'Evaluez avec precision',
      description: 'Activez le matching, le Test IA et la priorisation des profils sans alourdir vos equipes.'
    },
    {
      step: '03',
      title: 'Transformez plus vite',
      description: 'Planifiez les entretiens, pilotez le pipeline et gardez une experience candidat plus fluide.'
    }
  ];
  readonly recruiterSignals = [
    'Kanban intelligent pour suivre les candidatures sans perte de contexte',
    'Tests IA, matching et Smart Interview Planner dans un meme parcours',
    'Messagerie, invitations et insights pour accelerer les prises de decision'
  ];
  readonly candidateSignals = [
    'Recherche d offres plus lisible avec score de compatibilite',
    'Assistant IA pour comprendre comment ameliorer votre profil',
    'Pipeline simple pour suivre tests, entretiens et decisions finales'
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private offerService: OfferService
  ) {
    this.registration = this.authService.getLastRegistration();
    this.configureActions();
  }

  ngOnInit(): void {
    this.loadOffers();
  }

  get featuredJobs() {
    return this.filteredJobsList.slice(0, 6);
  }

  get featuredCompanies() {
    return this.companies.slice(0, 4);
  }

  get featuredCandidates() {
    return [...this.candidates].sort((left, right) => right.score - left.score).slice(0, 3);
  }

  get recentOfferPreview() {
    return this.allJobs.slice(0, 4);
  }

  get marketHighlights() {
    return [
      {
        label: 'Offres actives',
        value: this.allJobs.length.toString().padStart(2, '0'),
        detail: 'Postes visibles et navigables depuis une recherche centrale'
      },
      {
        label: 'Entreprises suivies',
        value: this.companies.length.toString().padStart(2, '0'),
        detail: 'Organisations actives avec une lecture plus premium de leur marque employeur'
      },
      {
        label: 'Profils en veille',
        value: this.candidates.length.toString().padStart(2, '0'),
        detail: 'Talents valorises par competences, score et disponibilite'
      }
    ];
  }

  updateFilteredJobs(): void {
    this.filteredJobsList = this.allJobs.filter((job) => {
      const matchTitle = !this.jobTitleQuery || job.title.toLowerCase().includes(this.jobTitleQuery.toLowerCase());
      const matchLocation = !this.locationQuery || job.location.toLowerCase().includes(this.locationQuery.toLowerCase());
      const matchCategory = this.selectedCategory === 'Toutes les categories' || job.category.toLowerCase() === this.selectedCategory.toLowerCase();
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
    this.updateFilteredJobs();
  }

  searchJobs(): void {
    this.updateFilteredJobs();
    const jobsSection = document.getElementById('jobs-section');
    jobsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  resetSearch(): void {
    this.jobTitleQuery = '';
    this.locationQuery = '';
    this.selectedCategory = 'Toutes les categories';
    this.updateFilteredJobs();
  }

  openJobAction(jobId?: number): void {
    if (jobId) {
      this.router.navigate(['/job-details', jobId]);
      return;
    }

    if (this.authService.isCandidate()) {
      this.router.navigate(['/job-list']);
      return;
    }

    this.router.navigate(['/login']);
  }

  askForDemo(): void {
    if (this.authService.isLoggedIn()) {
      this.router.navigate([this.authService.getRoleHomeRoute()]);
      return;
    }

    this.router.navigate(['/register']);
  }

  private configureActions(): void {
    const isCandidate = this.authService.isCandidate();
    const isRecruiter = this.authService.isRecruiter();
    const isAdmin = this.authService.isAdmin();
    const isLoggedIn = this.authService.isLoggedIn();

    this.profileActionRoute = isCandidate ? '/profile' : (isLoggedIn ? this.authService.getRoleHomeRoute() : '/register');
    this.profileActionLabel = isCandidate ? 'Mettre a jour mon profil' : 'Lancer Smart Recruit';

    this.resumeActionRoute = isCandidate ? '/submit-resume' : '/login';
    this.resumeActionLabel = isCandidate ? 'Deposer mon CV' : 'Se connecter';

    this.companiesActionRoute = isAdmin ? '/company-list' : '/about';
    this.companiesActionLabel = isAdmin ? 'Voir les entreprises' : 'Explorer la plateforme';

    if (isRecruiter) {
      this.profilesActionRoute = '/candidate-list';
      this.profilesActionLabel = 'Explorer les talents';
      return;
    }

    if (isCandidate) {
      this.profilesActionRoute = '/job-list';
      this.profilesActionLabel = 'Voir les offres';
      return;
    }

    this.profilesActionRoute = '/register';
    this.profilesActionLabel = 'Creer un compte';
  }

  private loadOffers(): void {
    this.loadingJobs = true;
    this.jobsError = '';

    this.offerService.getOffers().subscribe({
      next: (offers) => {
        this.allJobs = offers.map((offer) => this.toHomeJobItem(offer));
        const apiCategories = Array.from(new Set(this.allJobs.map((job) => job.category).filter(Boolean)));
        this.categories = Array.from(new Set([...JOB_CATEGORIES.map((category) => category.title), ...apiCategories]));
        this.updateFilteredJobs();
        this.loadingJobs = false;
      },
      error: (error: { message?: string }) => {
        this.allJobs = [];
        this.filteredJobsList = [];
        this.loadingJobs = false;
        this.jobsError = error.message || 'Chargement des offres impossible.';
      }
    });
  }

  private toHomeJobItem(offer: OfferResponse): HomeJobItem {
    return {
      id: offer.id,
      title: offer.titre || 'Offre',
      category: offer.categorie || 'General',
      contractType: offer.typeContrat || 'Contrat',
      companyName: offer.nomEntreprise || 'Entreprise',
      location: offer.localisation || 'Non precisee',
      summary: offer.description || 'Description a venir.',
      salary: `${Math.round(offer.salaire || 0)} ${offer.devise || 'TND'}`
    };
  }
}
