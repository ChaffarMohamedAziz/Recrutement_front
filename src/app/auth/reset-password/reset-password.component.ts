import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  if (!password || !confirmPassword) {
    return null;
  }

  return password === confirmPassword ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css'
})
export class ResetPasswordComponent {
  readonly resetPasswordForm;

  readonly token: string;
  isSubmitting = false;
  isSuccess = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {
    this.resetPasswordForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: passwordMatchValidator });

    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';

    if (!this.token) {
      this.errorMessage = 'Lien de reinitialisation invalide : token manquant.';
    }
  }

  onSubmit(): void {
    if (!this.token || this.resetPasswordForm.invalid || this.isSubmitting) {
      this.resetPasswordForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.resetPassword({
      token: this.token,
      newPassword: this.resetPasswordForm.getRawValue().password ?? ''
    }).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.isSuccess = true;
        this.successMessage = response.message;
      },
      error: (error: Error) => {
        this.isSubmitting = false;
        this.isSuccess = false;
        this.errorMessage = error.message;
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
