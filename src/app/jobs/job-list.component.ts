import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApplicationService } from '../services/application.service';
import { CandidateProfileService, CandidateSkillItem } from '../services/candidate-profile.service';
import { OfferResponse, OfferService } from '../services/offer.service';
import { PageHeroComponent } from '../shared/page-hero/page-hero.component';

type MatchTone = 'success' | 'warning' | 'danger';

interface JobListItem {
  id: number;
  title: string;
  companyName: string;
  companyVerified?: boolean;
  location: string;
  contractType: 'CDI' | 'CDD' | 'Stage' | 'Temps plein' | 'Temps partiel';
  experience: string;
  salaryLabel: string;
  salaryMin: number;
  summary: string;
  badge?: string;
  logoText: string;
  logoTone: 'red' | 'green' | 'orange' | 'blue' | 'yellow' | 'violet' | 'cyan' | 'emerald';
  postedAt: string;
  compatibilityScore: number | null;
  alreadyApplied: boolean;
  applicationStatus: string | null;
  offerSkills: string[];
  matchingSkills: string[];
  missingSkills: string[];
  matchTone: MatchTone;
  matchLabel: string;
  aiTip: string;
  saved: boolean;
}

@Component({
  selector: 'app-job-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeroComponent],
  templateUrl: './job-list.component.html',
  styleUrl: './job-list.component.css'
})
export class JobListComponent implements OnInit {
  private readonly savedOffersStorageKey = 'smart-recruit_saved_offers';

  readonly defaultLocation = 'Toutes les villes';
  readonly defaultContractType = 'Tous les types';
  readonly defaultExperience = 'Toute experience';
  readonly defaultSort = 'recent';
  readonly pageSize = 8;

  jobs: JobListItem[] = [];
  loading = false;
  errorMessage = '';
  applyMessage = '';
  applyingJobId: number | null = null;
  searchTerm = '';
  selectedLocation = this.defaultLocation;
  selectedContractType = this.defaultContractType;
  selectedExperience = this.defaultExperience;
  draftSearchTerm = '';
  draftLocation = this.defaultLocation;
  draftContractType = this.defaultContractType;
  draftExperience = this.defaultExperience;
  selectedSort = this.defaultSort;
  currentPage = 1;

  locations = [this.defaultLocation];
  readonly contractTypes = [this.defaultContractType, 'CDI', 'CDD', 'Stage', 'Temps plein', 'Temps partiel'];
  experienceOptions = [this.defaultExperience];
  readonly sortOptions = [
    { value: 'recent', label: 'Plus recentes' },
    { value: 'salary-desc', label: 'Salaire le plus eleve' },
    { value: 'salary-asc', label: 'Salaire le plus bas' },
    { value: 'match', label: 'Meilleur matching' },
    { value: 'title', label: 'Ordre alphabetique' }
  ];

  private candidateSkillNames = new Set<string>();
  private savedOfferIds = new Set<number>();

  constructor(
    private readonly offerService: OfferService,
    private readonly applicationService: ApplicationService,
    private readonly candidateProfileService: CandidateProfileService
  ) {}

  ngOnInit(): void {
    this.loadSavedOffers();
    this.loadCandidateProfile();
    this.loadOffers();
  }

  get filteredJobs(): JobListItem[] {
    const normalizedSearch = this.searchTerm.trim().toLowerCase();

    const filtered = this.jobs.filter((job) => {
      const matchesSearch = !normalizedSearch || [
        job.title,
        job.companyName,
        job.summary,
        job.location,
        job.contractType,
        ...job.offerSkills
      ].some((value) => value.toLowerCase().includes(normalizedSearch));

      const matchesLocation = this.selectedLocation === this.defaultLocation || job.location === this.selectedLocation;
      const matchesContract = this.selectedContractType === this.defaultContractType || job.contractType === this.selectedContractType;
      const matchesExperience = this.selectedExperience === this.defaultExperience || job.experience === this.selectedExperience;

      return matchesSearch && matchesLocation && matchesContract && matchesExperience;
    });

    return filtered.sort((left, right) => {
      if (this.selectedSort === 'salary-desc') {
        return right.salaryMin - left.salaryMin;
      }

      if (this.selectedSort === 'salary-asc') {
        return left.salaryMin - right.salaryMin;
      }

      if (this.selectedSort === 'match') {
        return (right.compatibilityScore ?? 0) - (left.compatibilityScore ?? 0);
      }

      if (this.selectedSort === 'title') {
        return left.title.localeCompare(right.title);
      }

      return new Date(right.postedAt).getTime() - new Date(left.postedAt).getTime();
    });
  }

  get totalResults(): number {
    return this.filteredJobs.length;
  }

  get pageCount(): number {
    return Math.ceil(this.totalResults / this.pageSize);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.pageCount }, (_, index) => index + 1);
  }

  get paginatedJobs(): JobListItem[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredJobs.slice(startIndex, startIndex + this.pageSize);
  }

  get savedJobsCount(): number {
    return this.jobs.filter((job) => job.saved).length;
  }

  applyFilters(): void {
    this.searchTerm = this.draftSearchTerm;
    this.selectedLocation = this.draftLocation;
    this.selectedContractType = this.draftContractType;
    this.selectedExperience = this.draftExperience;
    this.currentPage = 1;
    this.loadOffers(false);
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedLocation = this.defaultLocation;
    this.selectedContractType = this.defaultContractType;
    this.selectedExperience = this.defaultExperience;
    this.draftSearchTerm = '';
    this.draftLocation = this.defaultLocation;
    this.draftContractType = this.defaultContractType;
    this.draftExperience = this.defaultExperience;
    this.selectedSort = this.defaultSort;
    this.currentPage = 1;
    this.loadOffers(false);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.pageCount) {
      return;
    }

    this.currentPage = page;
  }

  previousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  trackByJobId(_: number, job: JobListItem): number {
    return job.id;
  }

  applyToJob(job: JobListItem): void {
    if (job.alreadyApplied || this.applyingJobId === job.id) {
      return;
    }

    this.applyMessage = '';
    this.errorMessage = '';
    this.applyingJobId = job.id;

    this.applicationService.applyToOffer(job.id).subscribe({
      next: (application) => {
        this.jobs = this.jobs.map((item) => item.id === job.id ? {
          ...item,
          alreadyApplied: true,
          applicationStatus: application.status
        } : item);
        this.applyMessage = `Votre candidature pour ${job.title} a bien ete envoyee.`;
        this.applyingJobId = null;
      },
      error: (error: { message?: string }) => {
        this.errorMessage = error.message || 'Postulation impossible.';
        this.applyingJobId = null;
      }
    });
  }

  toggleSaved(job: JobListItem): void {
    if (job.saved) {
      this.savedOfferIds.delete(job.id);
    } else {
      this.savedOfferIds.add(job.id);
    }

    this.persistSavedOffers();
    this.jobs = this.jobs.map((item) => item.id === job.id ? { ...item, saved: !item.saved } : item);
  }

  private loadCandidateProfile(): void {
    this.candidateProfileService.getCurrentProfile().subscribe({
      next: (profile) => {
        this.candidateSkillNames = new Set(
          this.parseSkillItems(profile.skillsJson)
            .map((item) => (item.title || '').trim().toLowerCase())
            .filter(Boolean)
        );
        this.loadOffers(false);
      },
      error: () => {
        this.candidateSkillNames = new Set<string>();
      }
    });
  }

  private loadOffers(preserveMessages = true): void {
    this.loading = true;
    this.errorMessage = preserveMessages ? this.errorMessage : '';

    this.offerService.getOffers().subscribe({
      next: (items) => {
        this.jobs = items.map((item) => this.toJobListItem(item));
        this.locations = [this.defaultLocation, ...this.collectUnique(this.jobs.map((job) => job.location))];
        this.experienceOptions = [this.defaultExperience, ...this.collectUnique(this.jobs.map((job) => job.experience))];
        if (!this.locations.includes(this.draftLocation)) {
          this.draftLocation = this.defaultLocation;
        }
        if (!this.locations.includes(this.selectedLocation)) {
          this.selectedLocation = this.defaultLocation;
        }
        if (!this.experienceOptions.includes(this.draftExperience)) {
          this.draftExperience = this.defaultExperience;
        }
        if (!this.experienceOptions.includes(this.selectedExperience)) {
          this.selectedExperience = this.defaultExperience;
        }
        this.loading = false;
      },
      error: (error: { message?: string }) => {
        this.loading = false;
        this.errorMessage = error.message || 'Chargement des offres impossible.';
      }
    });
  }

  private toJobListItem(item: OfferResponse): JobListItem {
    const title = item.titre || 'Offre';
    const offerSkills = (item.competences || [])
      .map((skill) => skill.nom?.trim())
      .filter((skill): skill is string => !!skill);
    const matchingSkills = offerSkills.filter((skill) => this.candidateSkillNames.has(skill.toLowerCase()));
    const missingSkills = offerSkills.filter((skill) => !this.candidateSkillNames.has(skill.toLowerCase()));
    const score = item.compatibilityScore ?? null;
    const matchTone = this.getMatchTone(score);

    return {
      id: item.id,
      title,
      companyName: item.nomEntreprise || 'Entreprise',
      companyVerified: true,
      location: item.localisation || 'Non precisee',
      contractType: (item.typeContrat as JobListItem['contractType']) || 'CDI',
      experience: item.experienceRequise || 'Toute experience',
      salaryLabel: `${Math.round(item.salaire || 0)} ${item.devise || 'TND'}`,
      salaryMin: Number(item.salaire || 0),
      summary: item.description || 'Description a venir.',
      badge: item.datePublication === new Date().toISOString().slice(0, 10) ? 'Nouveau' : undefined,
      logoText: this.buildLogoText(title),
      logoTone: this.pickTone(item.id),
      postedAt: item.datePublication || '2026-01-01',
      compatibilityScore: score,
      alreadyApplied: !!item.alreadyApplied,
      applicationStatus: item.applicationStatus ?? null,
      offerSkills,
      matchingSkills,
      missingSkills,
      matchTone,
      matchLabel: this.getMatchLabel(score),
      aiTip: this.buildAiTip(score, matchingSkills, missingSkills),
      saved: this.savedOfferIds.has(item.id)
    };
  }

  private getMatchTone(score: number | null): MatchTone {
    if ((score ?? 0) >= 80) {
      return 'success';
    }

    if ((score ?? 0) >= 60) {
      return 'warning';
    }

    return 'danger';
  }

  private getMatchLabel(score: number | null): string {
    if ((score ?? 0) >= 80) {
      return 'Matching eleve';
    }

    if ((score ?? 0) >= 60) {
      return 'Matching correct';
    }

    return 'Matching a renforcer';
  }

  private buildAiTip(score: number | null, matchingSkills: string[], missingSkills: string[]): string {
    if ((score ?? 0) >= 85) {
      return 'Votre profil est deja bien aligne. Candidatez rapidement pour garder l avantage.';
    }

    if (matchingSkills.length && missingSkills.length) {
      return `Mettez en avant ${matchingSkills[0]} et completez idealement ${missingSkills[0]}.`;
    }

    if (!matchingSkills.length && missingSkills.length) {
      return `Renforcez votre profil sur ${missingSkills.slice(0, 2).join(' / ')} avant de postuler.`;
    }

    return 'Ajoutez davantage de competences dans votre profil pour affiner le matching.';
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

  private buildLogoText(value: string): string {
    return value
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((item) => item.charAt(0).toUpperCase())
      .join('');
  }

  private pickTone(id: number): JobListItem['logoTone'] {
    const tones: JobListItem['logoTone'][] = ['red', 'green', 'orange', 'blue', 'yellow', 'violet', 'cyan', 'emerald'];
    return tones[id % tones.length];
  }

  private collectUnique(values: string[]): string[] {
    return Array.from(new Set(values.filter((item) => item && item.trim())));
  }

  private loadSavedOffers(): void {
    try {
      const raw = localStorage.getItem(this.savedOffersStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        this.savedOfferIds = new Set(parsed.filter((item) => typeof item === 'number'));
      }
    } catch {
      this.savedOfferIds = new Set<number>();
    }
  }

  private persistSavedOffers(): void {
    localStorage.setItem(this.savedOffersStorageKey, JSON.stringify(Array.from(this.savedOfferIds)));
  }
}
