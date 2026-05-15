import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ThemeService } from './services/theme.service';
import { NavbarComponent } from './shared/navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Recrutement_front';
  currentUrl = '';

  constructor(private router: Router, private themeService: ThemeService) {
    this.themeService.initializeTheme();
    this.currentUrl = this.router.url;

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentUrl = event.urlAfterRedirects;
      });
  }

  get shouldShowNavbar(): boolean {
    const normalizedUrl = this.currentUrl.split('?')[0];

    return ![
      '/login',
      '/register',
      '/auth/login',
      '/auth/register',
      '/verify-email',
      '/forgot-password',
      '/reset-password'
    ].includes(normalizedUrl);
  }
}
