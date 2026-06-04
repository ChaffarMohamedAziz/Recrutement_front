import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AuthService, UserProfile, UserSummary } from '../../services/auth.service';
import { CsvExportService } from '../../services/csv-export.service';
import { PageHeroComponent } from '../../shared/page-hero/page-hero.component';

type UserFilter = 'ALL' | 'CANDIDATE' | 'RECRUITER';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeroComponent],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.css'
})
export class UserListComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly csvExportService = inject(CsvExportService);

  users: UserSummary[] = [];
  searchQuery = '';
  loading = false;
  errorMessage = '';
  successMessage = '';
  deactivatingUserId: number | null = null;
  activatingUserId: number | null = null;
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

  get visibleUsers(): UserSummary[] {
    return this.users.filter((item) => item.role !== 'ADMIN');
  }

  get filteredUsers(): UserSummary[] {
    if (this.activeFilter === 'ALL') {
      return this.visibleUsers;
    }
    return this.visibleUsers.filter((item) => item.role === this.activeFilter);
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

  deactivateUser(userItem: UserSummary): void {
    if (this.deactivatingUserId !== null || this.activatingUserId !== null || !this.isUserActive(userItem)) {
      return;
    }

    const confirmed = window.confirm(
      `Desactiver le compte ${userItem.nom} ? L'utilisateur ne pourra plus se connecter, mais ses donnees seront conservees.`
    );
    if (!confirmed) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.deactivatingUserId = userItem.id;

    this.authService.suspendUser(userItem.id).subscribe({
      next: (response) => {
        this.deactivatingUserId = null;
        this.successMessage = response.message;
        this.closeDetails();
        this.loadUsers(this.searchQuery);
      },
      error: (error: Error) => {
        this.deactivatingUserId = null;
        this.errorMessage = error.message;
      }
    });
  }

  activateUser(userItem: UserSummary): void {
    if (this.activatingUserId !== null || this.deactivatingUserId !== null || this.isUserActive(userItem)) {
      return;
    }

    const confirmed = window.confirm(`Activer le compte ${userItem.nom} ? L'utilisateur pourra de nouveau se connecter.`);
    if (!confirmed) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.activatingUserId = userItem.id;

    const activationRequest = userItem.role === 'RECRUITER'
      ? this.authService.approveRecruiterAccount(userItem.id)
      : this.authService.activateUser(userItem.id);

    activationRequest.subscribe({
      next: (response) => {
        this.activatingUserId = null;
        this.successMessage = response.message || 'Compte active avec succes.';
        this.closeDetails();
        this.loadUsers(this.searchQuery);
      },
      error: (error: Error) => {
        this.activatingUserId = null;
        this.errorMessage = error.message;
      }
    });
  }

  exportUsersCsv(): void {
    const rows = [
      ['Nom', 'Email', 'Rôle']
    ];

    rows[0].push('Statut');
    this.filteredUsers.forEach((item) => rows.push([item.nom, item.email, this.getRoleLabel(item.role), this.getAccountStatusLabel(item)]));
    this.csvExportService.exportToCsv('admin-users.csv', rows);
  }

  isDeactivating(userId: number): boolean {
    return this.deactivatingUserId === userId;
  }

  isActivating(userId: number): boolean {
    return this.activatingUserId === userId;
  }

  isUserActive(userItem: UserSummary): boolean {
    return userItem.approvalStatus !== 'SUSPENDED' && userItem.statutCompte !== false;
  }

  getAccountStatusLabel(userItem: UserSummary): string {
    if (userItem.approvalStatus === 'SUSPENDED' || userItem.statutCompte === false) {
      return 'Desactive';
    }
    if (userItem.approvalStatus === 'PENDING') {
      return 'En attente';
    }
    if (userItem.approvalStatus === 'REFUSED') {
      return 'Refuse';
    }
    return 'Actif';
  }

  getAccountStatusClass(userItem: UserSummary): string {
    if (userItem.approvalStatus === 'SUSPENDED' || userItem.statutCompte === false || userItem.approvalStatus === 'REFUSED') {
      return 'danger';
    }
    if (userItem.approvalStatus === 'PENDING') {
      return 'warning';
    }
    return 'success';
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

  isSelectedCandidate(): boolean {
    return (this.selectedProfile?.role || this.selectedSummary?.role || '').replace('ROLE_', '').toUpperCase() === 'CANDIDATE';
  }

  isSelectedRecruiter(): boolean {
    return (this.selectedProfile?.role || this.selectedSummary?.role || '').replace('ROLE_', '').toUpperCase() === 'RECRUITER';
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
