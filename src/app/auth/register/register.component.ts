import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  registerForm: FormGroup;
  selectedRole: 'CANDIDATE' | 'RECRUITER' = 'CANDIDATE';
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
    this.registerForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['CANDIDATE', Validators.required],
      phone: [''],
      city: [''],
      jobTitle: [''],
      position: [''],
      department: [''],
      company: ['']
    });
  }

  setRole(role: 'CANDIDATE' | 'RECRUITER'): void {
    this.selectedRole = role;
    this.registerForm.patchValue({ role });
  }

  onSubmit(): void {
    if (this.registerForm.invalid || this.isSubmitting) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;

    if (this.selectedRole === 'CANDIDATE') {
      this.authService.registerCandidate({
        email: this.registerForm.value.email,
        password: this.registerForm.value.password,
        username: this.registerForm.value.name,
        phoneNumber: this.registerForm.value.phone || '',
        role: 'CANDIDATE'
      }).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.router.navigate(['/home']);
        },
        error: (error: Error) => {
          this.isSubmitting = false;
          this.errorMessage = error.message;
        }
      });

      return;
    }

    this.authService.registerRecruiter({
      email: this.registerForm.value.email,
      username: this.registerForm.value.name,
      password: this.registerForm.value.password,
      fonction: this.registerForm.value.jobTitle || '',
      poste: this.registerForm.value.position || '',
      departement: this.registerForm.value.department || '',
      identreprise: null
    }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/home']);
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
