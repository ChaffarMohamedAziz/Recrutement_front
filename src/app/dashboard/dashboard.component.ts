import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, AuthUser } from '../services/auth.service';

type AtsStatus = 'A_TRIER' | 'ENTRETIEN' | 'RETENU' | 'REFUSE';

interface SkillCheck {
  name: string;
  matched: boolean;
}

interface CandidateApplication {
  id: number;
  candidateName: string;
  email: string;
  position: string;
  location: string;
  experience: number;
  appliedAt: string;
  status: AtsStatus;
  score: number;
  summary: string;
  matchingSkills: string[];
  missingSkills: string[];
  skills: SkillCheck[];
}

interface AtsColumn {
  key: AtsStatus;
  title: string;
  accent: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  user: AuthUser | null;
  minScore = 70;
  draggedCandidateId: number | null = null;

  readonly columns: AtsColumn[] = [
    { key: 'A_TRIER', title: 'A trier', accent: 'blue' },
    { key: 'ENTRETIEN', title: 'Entretien', accent: 'amber' },
    { key: 'RETENU', title: 'Retenu', accent: 'green' },
    { key: 'REFUSE', title: 'Refuse', accent: 'red' }
  ];

  readonly applications: CandidateApplication[] = [
    {
      id: 1,
      candidateName: 'Amine Ben Salah',
      email: 'amine.dev@email.com',
      position: 'Frontend Angular',
      location: 'Tunis',
      experience: 4,
      appliedAt: '2026-03-18',
      status: 'A_TRIER',
      score: 88,
      summary: 'Profil solide sur Angular et UI. Bonne autonomie et sens produit.',
      matchingSkills: ['Angular', 'TypeScript', 'RxJS'],
      missingSkills: ['NgRx'],
      skills: [
        { name: 'Angular', matched: true },
        { name: 'TypeScript', matched: true },
        { name: 'RxJS', matched: true },
        { name: 'NgRx', matched: false }
      ]
    },
    {
      id: 2,
      candidateName: 'Ines Trabelsi',
      email: 'ines.data@email.com',
      position: 'Data Analyst',
      location: 'Sfax',
      experience: 3,
      appliedAt: '2026-03-17',
      status: 'ENTRETIEN',
      score: 76,
      summary: 'Tres bonne maitrise SQL et Power BI, communication claire.',
      matchingSkills: ['SQL', 'Power BI', 'Excel'],
      missingSkills: ['Python'],
      skills: [
        { name: 'SQL', matched: true },
        { name: 'Power BI', matched: true },
        { name: 'Excel', matched: true },
        { name: 'Python', matched: false }
      ]
    },
    {
      id: 3,
      candidateName: 'Youssef Jaziri',
      email: 'youssef.backend@email.com',
      position: 'Backend Spring Boot',
      location: 'Nabeul',
      experience: 5,
      appliedAt: '2026-03-15',
      status: 'RETENU',
      score: 93,
      summary: 'Excellent matching technique, architecture propre et bonne seniorite.',
      matchingSkills: ['Java', 'Spring Boot', 'PostgreSQL', 'Docker'],
      missingSkills: [],
      skills: [
        { name: 'Java', matched: true },
        { name: 'Spring Boot', matched: true },
        { name: 'PostgreSQL', matched: true },
        { name: 'Docker', matched: true }
      ]
    },
    {
      id: 4,
      candidateName: 'Mariem Gharbi',
      email: 'mariem.qa@email.com',
      position: 'QA Engineer',
      location: 'Sousse',
      experience: 2,
      appliedAt: '2026-03-14',
      status: 'REFUSE',
      score: 61,
      summary: 'Bonne base QA mais ecart important avec les competences demandees.',
      matchingSkills: ['Tests manuels'],
      missingSkills: ['Cypress', 'API Testing', 'Postman'],
      skills: [
        { name: 'Tests manuels', matched: true },
        { name: 'Cypress', matched: false },
        { name: 'API Testing', matched: false },
        { name: 'Postman', matched: false }
      ]
    },
    {
      id: 5,
      candidateName: 'Sarra Kefi',
      email: 'sarra.hr@email.com',
      position: 'Talent Acquisition',
      location: 'Tunis',
      experience: 6,
      appliedAt: '2026-03-20',
      status: 'A_TRIER',
      score: 82,
      summary: 'Tres bon fit metier, forte experience recrutement et coordination.',
      matchingSkills: ['Sourcing', 'Entretien RH', 'Communication'],
      missingSkills: ['ATS Reporting'],
      skills: [
        { name: 'Sourcing', matched: true },
        { name: 'Entretien RH', matched: true },
        { name: 'Communication', matched: true },
        { name: 'ATS Reporting', matched: false }
      ]
    },
    {
      id: 6,
      candidateName: 'Hamza Mejri',
      email: 'hamza.fullstack@email.com',
      position: 'Full Stack Developer',
      location: 'Monastir',
      experience: 4,
      appliedAt: '2026-03-19',
      status: 'ENTRETIEN',
      score: 71,
      summary: 'Bon profil generaliste, entretien utile pour confirmer la profondeur backend.',
      matchingSkills: ['Angular', 'Node.js', 'MongoDB'],
      missingSkills: ['Spring Boot'],
      skills: [
        { name: 'Angular', matched: true },
        { name: 'Node.js', matched: true },
        { name: 'MongoDB', matched: true },
        { name: 'Spring Boot', matched: false }
      ]
    }
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.user = this.authService.getCurrentUser();

    if (!this.user) {
      this.router.navigate(['/login']);
    }
  }

  get filteredApplications(): CandidateApplication[] {
    return this.applications.filter((candidate) => candidate.score >= this.minScore);
  }

  get totalVisibleCandidates(): number {
    return this.filteredApplications.length;
  }

  get averageVisibleScore(): number {
    if (!this.filteredApplications.length) {
      return 0;
    }

    const total = this.filteredApplications.reduce((sum, candidate) => sum + candidate.score, 0);
    return Math.round(total / this.filteredApplications.length);
  }

  getColumnApplications(status: AtsStatus): CandidateApplication[] {
    return this.filteredApplications.filter((candidate) => candidate.status === status);
  }

  getColumnCount(status: AtsStatus): number {
    return this.getColumnApplications(status).length;
  }

  setMinScore(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.minScore = value;
  }

  onDragStart(candidateId: number): void {
    this.draggedCandidateId = candidateId;
  }

  allowDrop(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(status: AtsStatus): void {
    if (this.draggedCandidateId === null) {
      return;
    }

    const candidate = this.applications.find((item) => item.id === this.draggedCandidateId);

    if (candidate) {
      candidate.status = status;
    }

    this.draggedCandidateId = null;
  }

  getMatchRatio(candidate: CandidateApplication): number {
    if (!candidate.skills.length) {
      return 0;
    }

    const matches = candidate.skills.filter((skill) => skill.matched).length;
    return Math.round((matches / candidate.skills.length) * 100);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
