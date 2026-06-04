import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.css'
})
export class VerifyEmailComponent {
  isLoading = true;
  isSuccess = false;
  message = 'Verification de votre adresse e-mail en cours...';

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router
  ) {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.isLoading = false;
      this.message = "Lien d'activation invalide : token manquant.";
      return;
    }

    this.authService.activateAccount(token).subscribe({
      next: (response: string) => {
        this.isLoading = false;
        this.isSuccess = true;
        this.message = response;
      },
      error: (error: Error) => {
        this.isLoading = false;
        this.isSuccess = false;
        this.message = error.message;
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
