import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Subject, interval } from 'rxjs';
import { startWith, takeUntil } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { MessagingService } from '../../services/messaging.service';
import { NotificationItem, NotificationService } from '../../services/notification.service';
import { ThemeService } from '../../services/theme.service';
import { filter } from 'rxjs/operators';

interface NavbarItem {
  label: string;
  link: string;
  exact?: boolean;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit, OnDestroy {
  readonly exactRouteOptions = { exact: true };
  readonly partialRouteOptions = { exact: false };
  private readonly destroy$ = new Subject<void>();

  isMobileMenuOpen = false;
  unreadCount = 0;
  isLoggedIn = false;
  isAdmin = false;
  hasUserAccess = false;
  isRecruiter = false;
  isCandidate = false;
  currentUser: ReturnType<AuthService['getCurrentUser']> = null;
  homeLink = '/home';
  navItems: NavbarItem[] = [];
  roleLabel = 'Visiteur';
  userInitials = 'SR';
  notificationsOpen = false;
  profileMenuOpen = false;
  notificationsLoading = false;
  notificationsError = '';
  notifications: NotificationItem[] = [];
  isScrolled = false;
  currentTheme: 'light' | 'dark' = 'light';
  unreadMessagesCount = 0;

  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService,
    private messagingService: MessagingService,
    private elementRef: ElementRef<HTMLElement>,
    private themeService: ThemeService
  ) {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.syncViewModel());
  }

  ngOnInit(): void {
    this.syncViewModel();
    this.updateScrolledState();
    this.currentTheme = this.themeService.currentTheme;
    this.themeService.currentTheme$
      .pipe(takeUntil(this.destroy$))
      .subscribe((theme) => {
        this.currentTheme = theme;
      });
    interval(30000)
      .pipe(startWith(0), takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.isLoggedIn) {
          this.refreshUnreadCount();
          this.refreshUnreadMessagesCount();
          if (this.notificationsOpen) {
            this.loadNotifications(false);
          }
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  @HostListener('document:click', ['$event'])
  handleDocumentClick(event: MouseEvent): void {
    const target = event.target as Node | null;
    if (!target) {
      return;
    }

    if (!this.elementRef.nativeElement.contains(target)) {
      this.notificationsOpen = false;
      this.profileMenuOpen = false;
    }
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.updateScrolledState();
  }

  trackByLink(_: number, item: NavbarItem): string {
    return item.link;
  }

  trackByNotificationId(_: number, item: NotificationItem): number {
    return item.id;
  }

  logout(): void {
    this.authService.logout();
    this.closeMobileMenu();
    this.notificationsOpen = false;
    this.profileMenuOpen = false;
    this.notifications = [];
    this.syncViewModel();
    this.router.navigate(['/login']);
  }

  toggleProfileMenu(event: MouseEvent): void {
    event.stopPropagation();

    if (!this.isLoggedIn) {
      return;
    }

    this.profileMenuOpen = !this.profileMenuOpen;
    if (this.profileMenuOpen) {
      this.notificationsOpen = false;
    }
  }

  goToChangePassword(event: MouseEvent): void {
    event.stopPropagation();
    this.profileMenuOpen = false;
    this.closeMobileMenu();
    this.router.navigate(['/change-password']);
  }

  toggleNotifications(event: MouseEvent): void {
    event.stopPropagation();

    if (!this.isLoggedIn) {
      return;
    }

    this.notificationsOpen = !this.notificationsOpen;
    if (this.notificationsOpen) {
      this.profileMenuOpen = false;
      this.loadNotifications(true);
    }
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  openMessaging(): void {
    this.closeMobileMenu();
    this.notificationsOpen = false;
    this.profileMenuOpen = false;
    void this.router.navigate(['/messages']);
  }

  markNotificationAsRead(notification: NotificationItem, event: MouseEvent): void {
    event.stopPropagation();

    if (!notification || notification.lue) {
      return;
    }

    this.notificationService.markAsRead(notification.id).subscribe({
      next: () => {
        this.notifications = this.notifications.map((item) =>
          item.id === notification.id ? { ...item, lue: true } : item
        );
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      },
      error: () => {
        // noop
      }
    });
  }

  markAllNotificationsAsRead(event?: MouseEvent): void {
    event?.stopPropagation();

    if (!this.unreadCount) {
      return;
    }

    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications = this.notifications.map((item) => ({ ...item, lue: true }));
        this.unreadCount = 0;
      },
      error: () => {
        // noop
      }
    });
  }

  private syncViewModel(): void {
    this.profileMenuOpen = false;
    this.notificationsOpen = false;
    this.currentUser = this.authService.getCurrentUser();
    this.isLoggedIn = this.authService.isLoggedIn();
    this.isAdmin = this.authService.isAdmin();
    this.hasUserAccess = this.authService.hasUserAccess();
    this.isRecruiter = this.authService.isRecruiter();
    this.isCandidate = this.authService.isCandidate();
    this.homeLink = this.isLoggedIn ? this.authService.getRoleHomeRoute() : '/home';
    this.navItems = this.buildNavItems();
    this.roleLabel = this.resolveRoleLabel();
    this.userInitials = this.buildUserInitials(this.currentUser?.username);

    if (this.isLoggedIn) {
      this.refreshUnreadCount();
      this.refreshUnreadMessagesCount();
      return;
    }

    this.unreadCount = 0;
    this.unreadMessagesCount = 0;
    this.notificationsOpen = false;
    this.profileMenuOpen = false;
    this.notifications = [];
  }

  private buildNavItems(): NavbarItem[] {
    if (this.isAdmin) {
      return [
        { label: 'Dashboard', link: '/admin-dashboard', exact: true },
        { label: 'Statistiques', link: '/admin/statistics', exact: true },
        { label: 'Abonnements', link: '/admin/subscriptions', exact: true },
        { label: 'Gérer les demandes recruteurs', link: '/admin/recruiter-activation' },
        { label: 'Gérer les utilisateurs', link: '/admin/users' },
        { label: 'Tags', link: '/admin/tags' }
      ];
    }

    if (this.isRecruiter) {
      return [
        { label: 'Profil', link: '/recruiter-space', exact: true },
        { label: "Offre d'emploi", link: '/post-a-job', exact: true },
        { label: 'Kanban', link: '/dashboard', exact: true },
        { label: 'Assistant IA', link: '/assistant', exact: true }
      ];
    }

    if (this.isCandidate) {
      return [
        { label: 'Profil', link: '/profile', exact: true },
        { label: "Offres d'emploi", link: '/job-list', exact: true },
        { label: 'Mes candidatures', link: '/candidate-space', exact: true },
        { label: 'Assistant IA', link: '/assistant', exact: true }
      ];
    }

    return [
      { label: 'Accueil', link: '/home', exact: true },
      { label: 'Emplois', link: '/job-list', exact: true },
      { label: 'Blogs', link: '/blog', exact: true },
      { label: 'Contact', link: '/contact', exact: true }
    ];
  }

  private resolveRoleLabel(): string {
    if (this.isAdmin) {
      return 'Admin';
    }

    if (this.isRecruiter) {
      return 'Recruteur';
    }

    if (this.isCandidate) {
      return 'Candidat';
    }

    return 'Visiteur';
  }

  private buildUserInitials(name?: string): string {
    const resolvedName = name || 'SR';
    return resolvedName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((item) => item.charAt(0).toUpperCase())
      .join('');
  }

  private loadNotifications(markReadAfterLoad: boolean): void {
    this.notificationsLoading = true;
    this.notificationsError = '';

    this.notificationService.getNotifications().subscribe({
      next: (items) => {
        this.notificationsLoading = false;
        this.notifications = items;

        if (markReadAfterLoad && this.unreadCount > 0) {
          this.markAllNotificationsAsRead();
        }
      },
      error: (error: Error) => {
        this.notificationsLoading = false;
        this.notificationsError = error.message;
      }
    });
  }

  private refreshUnreadCount(): void {
    this.notificationService.getUnreadCount().subscribe({
      next: (response) => {
        this.unreadCount = response.count ?? 0;
      },
      error: () => {
        this.unreadCount = 0;
      }
    });
  }

  private refreshUnreadMessagesCount(): void {
    if (!this.isRecruiter && !this.isCandidate) {
      this.unreadMessagesCount = 0;
      return;
    }

    this.messagingService.getConversations().subscribe({
      next: (conversations) => {
        this.unreadMessagesCount = conversations.reduce((sum, item) => sum + (item.unreadCount || 0), 0);
      },
      error: () => {
        this.unreadMessagesCount = 0;
      }
    });
  }

  private updateScrolledState(): void {
    this.isScrolled = window.scrollY > 8;
  }
}
