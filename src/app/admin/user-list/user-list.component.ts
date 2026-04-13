import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AuthService, UserSummary } from '../../services/auth.service';
import { PageHeroComponent } from '../../shared/page-hero/page-hero.component';

type UserFilter = 'ALL' | 'CANDIDATE' | 'RECRUITER';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeroComponent],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.css'
})
export class UserListComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);

  readonly user = this.authService.getCurrentUser();
  users: UserSummary[] = [];
  searchQuery = '';
  loading = false;
  errorMessage = '';
  successMessage = '';
  deletingUserId: number | null = null;
  activeFilter: UserFilter = 'ALL';
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

  get userInitials(): string {
    const name = this.user?.username || 'Admin';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((item) => item.charAt(0).toUpperCase())
      .join('');
  }

  get candidateCount(): number {
    return this.users.filter((item) => item.role === 'CANDIDATE').length;
  }

  get recruiterCount(): number {
    return this.users.filter((item) => item.role === 'RECRUITER').length;
  }

  get filteredUsers(): UserSummary[] {
    if (this.activeFilter === 'CANDIDATE') {
      return this.users.filter((item) => item.role === 'CANDIDATE');
    }

    if (this.activeFilter === 'RECRUITER') {
      return this.users.filter((item) => item.role === 'RECRUITER');
    }

    return this.users;
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
        this.users = items
          .map((userItem) => this.normalizeUser(userItem))
          .filter((userItem) => userItem.role !== 'ADMIN');
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
        this.loadUsers(this.searchQuery);
      },
      error: (error: Error) => {
        this.deletingUserId = null;
        this.errorMessage = error.message;
      }
    });
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

    return 'Utilisateur';
  }

  private normalizeUser(userItem: UserSummary): UserSummary {
    return {
      ...userItem,
      role: (userItem.role || '').replace('ROLE_', '').toUpperCase()
    };
  }
}
