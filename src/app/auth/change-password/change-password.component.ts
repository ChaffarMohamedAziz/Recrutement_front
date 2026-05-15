import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('newPassword')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  if (!password || !confirmPassword) {
    return null;
  }

  return password === confirmPassword ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.css'
})
export class ChangePasswordComponent {
  readonly changePasswordForm;
  isSubmitting = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {
    this.changePasswordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: passwordMatchValidator });
  }

  onSubmit(): void {
    if (this.changePasswordForm.invalid || this.isSubmitting) {
      this.changePasswordForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.successMessage = '';
    this.errorMessage = '';

    const formValue = this.changePasswordForm.getRawValue();

    this.authService.changePassword({
      currentPassword: formValue.currentPassword ?? '',
      newPassword: formValue.newPassword ?? ''
    }).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.successMessage = response.message;
        this.changePasswordForm.reset();
      },
      error: (error: Error) => {
        this.isSubmitting = false;
        this.errorMessage = error.message;
      }
    });
  }

  goBack(): void {
    this.router.navigate([this.authService.getRoleHomeRoute()]);
  }
}
