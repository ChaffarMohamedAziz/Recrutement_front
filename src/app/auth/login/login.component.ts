import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService, SocialProvider } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  loginForm: FormGroup;
  isSubmitting = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid || this.isSubmitting) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;

    this.authService.login(this.loginForm.getRawValue()).subscribe({
      next: () => {
        this.isSubmitting = false;
        const targetRoute = this.authService.getRoleHomeRoute();
        this.router.navigate([targetRoute]);
      },
      error: (error: Error) => {
        this.isSubmitting = false;
        this.errorMessage = error.message;
      }
    });
  }

  continueWithSocial(provider: SocialProvider): void {
    const emailControl = this.loginForm.get('email');
    const email = (emailControl?.value || '').trim();

    if (!email || emailControl?.invalid || this.isSubmitting) {
      emailControl?.markAsTouched();
      this.errorMessage = `Saisissez une adresse e-mail valide pour continuer avec ${this.getProviderLabel(provider)}.`;
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;

    this.authService.socialAuth({
      provider,
      mode: 'LOGIN',
      email
    }).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        if (!response.token) {
          this.errorMessage = response.message || 'Connexion sociale impossible.';
          return;
        }
        const targetRoute = this.authService.getRoleHomeRoute();
        this.router.navigate([targetRoute]);
      },
      error: (error: Error) => {
        this.isSubmitting = false;
        this.errorMessage = error.message;
      }
    });
  }

  private getProviderLabel(provider: SocialProvider): string {
    if (provider === 'GMAIL') {
      return 'Gmail';
    }
    if (provider === 'LINKEDIN') {
      return 'LinkedIn';
    }
    return 'Facebook';
  }
}
