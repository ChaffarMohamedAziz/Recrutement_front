import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-recruiter-space',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './recruiter-space.component.html',
  styleUrl: './recruiter-space.component.css'
})
export class RecruiterSpaceComponent {
  private readonly authService = inject(AuthService);
  readonly user = this.authService.getCurrentUser();

  readonly kpis = [
    { label: 'Offres actives', value: '8' },
    { label: 'Candidatures', value: '245' },
    { label: 'Entretiens', value: '18' }
  ];

  readonly recentCandidates = [
    { name: 'Thomas Martin', role: 'Vue: Senior', time: '15m' },
    { name: 'Julie Bernard', role: 'Java', time: '15m' }
  ];

  readonly recentActivity = [
    { initials: 'TM', title: 'Thomas Martin', subtitle: 'Developpeur Angular', value: '10m' },
    { initials: 'JB', title: 'Julie Bernard', subtitle: 'Full Stack Java', value: '12m' },
    { initials: 'SD', title: 'Sophie Dubois', subtitle: 'Product Owner', value: '30m' }
  ];

  get userInitials(): string {
    const name = this.user?.username || 'Recruteur';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((item) => item.charAt(0).toUpperCase())
      .join('');
  }
}
