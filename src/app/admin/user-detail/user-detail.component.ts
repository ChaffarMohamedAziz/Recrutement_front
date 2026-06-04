import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService, UserProfile } from '../../services/auth.service';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './user-detail.component.html',
  styleUrl: './user-detail.component.css'
})
export class UserDetailComponent implements OnInit {
  private readonly authServiceRef = inject(AuthService);
  user: UserProfile | null = null;
  loading = false;
  errorMessage = '';
  readonly currentUser = this.authServiceRef.getCurrentUser();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const userId = idParam ? Number(idParam) : NaN;
    if (!idParam || Number.isNaN(userId)) {
      this.errorMessage = 'Identifiant utilisateur invalide.';
      return;
    }
    this.loadUser(userId);
  }

  loadUser(userId: number): void {
    if (this.loading) {
      return;
    }
    this.loading = true;
    this.errorMessage = '';

    this.authService.getUserById(userId).subscribe({
      next: (user) => {
        this.loading = false;
        this.user = user;
      },
      error: (error: Error) => {
        this.loading = false;
        this.errorMessage = error.message;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/users']);
  }

  get userInitials(): string {
    const name = this.currentUser?.username || 'Admin';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((item) => item.charAt(0).toUpperCase())
      .join('');
  }

  getRoleLabel(role?: string): string {
    if (role === 'CANDIDATE') {
      return 'Candidat';
    }
    if (role === 'RECRUITER') {
      return 'Recruteur';
    }
    if (role === 'ADMIN') {
      return 'Admin';
    }
    return role || 'Utilisateur';
  }

  hasValue(value?: string | number | null): boolean {
    if (typeof value === 'number') {
      return value > 0;
    }
    return !!value && `${value}`.trim().length > 0;
  }
}
