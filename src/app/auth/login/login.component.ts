import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

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
  readonly facebookLoginUrl = 'https://www.facebook.com/login/';
  readonly googleLoginUrl = 'https://accounts.google.com/signin';
  readonly linkedInLoginUrl = 'https://www.linkedin.com/login';

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
      next: (user) => {
        this.isSubmitting = false;
        const normalizedRole = (user.role ?? '').replace('ROLE_', '').toUpperCase();
        const targetRoute = normalizedRole === 'ADMIN' ? '/dashboard' : '/job-list';
        this.router.navigate([targetRoute]);
      },
      error: (error: Error) => {
        this.isSubmitting = false;
        this.errorMessage = error.message;
      }
    });
  }

  openFacebookLogin(): void {
    window.location.href = this.facebookLoginUrl;
  }

  openGoogleLogin(): void {
    window.location.href = this.googleLoginUrl;
  }

  openLinkedInLogin(): void {
    window.location.href = this.linkedInLoginUrl;
  }
}
