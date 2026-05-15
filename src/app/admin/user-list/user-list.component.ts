import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AuthService, UserProfile, UserSummary } from '../../services/auth.service';
import { PageHeroComponent } from '../../shared/page-hero/page-hero.component';

type UserFilter = 'ALL' | 'CANDIDATE' | 'RECRUITER' | 'ADMIN';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeroComponent],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.css'
})
export class UserListComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);

  users: UserSummary[] = [];
  searchQuery = '';
  loading = false;
  errorMessage = '';
  successMessage = '';
  deletingUserId: number | null = null;
  activeFilter: UserFilter = 'ALL';
  selectedProfile: UserProfile | null = null;
  selectedSummary: UserSummary | null = null;
  loadingProfile = false;
  showUserModal = false;
  private latestRequestId = 0;
  private searchSubject = new Subject<string>();
  private subscriptions = new Subscription();

  ngOnInit(): void {
    this.loadUsers();
    this.subscriptions.add(
      this.searchSubject
        .pipe(debounceTime(300), distinctUntilChanged())
        .subscribe((value) => this.loadUsers(value))
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get candidateCount(): number {
    return this.users.filter((item) => item.role === 'CANDIDATE').length;
  }

  get recruiterCount(): number {
    return this.users.filter((item) => item.role === 'RECRUITER').length;
  }

  get adminCount(): number {
    return this.users.filter((item) => item.role === 'ADMIN').length;
  }

  get filteredUsers(): UserSummary[] {
    if (this.activeFilter === 'ALL') {
      return this.users;
    }
    return this.users.filter((item) => item.role === this.activeFilter);
  }

  setFilter(filter: UserFilter): void {
    this.activeFilter = filter;
  }

  onSearchChange(value: string): void {
    this.searchQuery = value || '';
    this.searchSubject.next(this.searchQuery.trim());
  }

  loadUsers(query?: string): void {
    const requestId = ++this.latestRequestId;
    this.loading = true;
    this.errorMessage = '';
    const normalizedQuery = (query || '').trim();

    this.authService.getUsers(normalizedQuery).subscribe({
      next: (items) => {
        if (requestId !== this.latestRequestId) {
          return;
        }

        this.loading = false;
        this.users = items.map((userItem) => this.normalizeUser(userItem));
      },
      error: (error: Error) => {
        if (requestId !== this.latestRequestId) {
          return;
        }

        this.loading = false;
        this.errorMessage = error.message;
      }
    });
  }

  openDetails(userItem: UserSummary): void {
    this.selectedSummary = userItem;
    this.selectedProfile = null;
    this.showUserModal = true;
    this.loadingProfile = true;
    this.errorMessage = '';

    this.authService.getUserById(userItem.id).subscribe({
      next: (profile) => {
        this.selectedProfile = profile;
        this.loadingProfile = false;
      },
      error: (error: Error) => {
        this.loadingProfile = false;
        this.errorMessage = error.message;
      }
    });
  }

  closeDetails(): void {
    this.showUserModal = false;
    this.selectedProfile = null;
    this.selectedSummary = null;
  }

  deleteUser(userItem: UserSummary): void {
    if (this.deletingUserId !== null) {
      return;
    }

    const confirmed = window.confirm(`Voulez-vous supprimer l'utilisateur ${userItem.nom} ?`);
    if (!confirmed) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.deletingUserId = userItem.id;

    this.authService.deleteUser(userItem.id).subscribe({
      next: (response) => {
        this.deletingUserId = null;
        this.successMessage = response.message;
        this.closeDetails();
        this.loadUsers(this.searchQuery);
      },
      error: (error: Error) => {
        this.deletingUserId = null;
        this.errorMessage = error.message;
      }
    });
  }

  exportUsersCsv(): void {
    const rows = [
      ['Nom', 'Email', 'Rôle']
    ];

    this.filteredUsers.forEach((item) => rows.push([item.nom, item.email, this.getRoleLabel(item.role)]));
    const content = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'admin-users.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  isDeleting(userId: number): boolean {
    return this.deletingUserId === userId;
  }

  getRoleLabel(role: string): string {
    if (role === 'CANDIDATE') {
      return 'Candidat';
    }
    if (role === 'RECRUITER') {
      return 'Recruteur';
    }
    if (role === 'ADMIN') {
      return 'Admin';
    }
    return 'Utilisateur';
  }

  profileValue(value: string | number | boolean | undefined | null): string {
    if (value === null || value === undefined || value === '') {
      return 'Non disponible';
    }
    if (typeof value === 'boolean') {
      return value ? 'Oui' : 'Non';
    }
    return String(value);
  }

  private normalizeUser(userItem: UserSummary): UserSummary {
    return {
      ...userItem,
      role: (userItem.role || '').replace('ROLE_', '').toUpperCase()
    };
  }
}
