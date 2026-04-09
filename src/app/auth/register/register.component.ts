import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService, SocialProvider } from '../../services/auth.service';

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
  successMessage = '';

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
    this.successMessage = '';
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

  continueWithSocial(provider: SocialProvider): void {
    const nameControl = this.registerForm.get('name');
    const emailControl = this.registerForm.get('email');
    const name = (nameControl?.value || '').trim();
    const email = (emailControl?.value || '').trim();

    if (!name) {
      nameControl?.markAsTouched();
      this.errorMessage = 'Saisissez votre nom complet avant de continuer avec un reseau social.';
      this.successMessage = '';
      return;
    }

    if (!email || emailControl?.invalid || this.isSubmitting) {
      emailControl?.markAsTouched();
      this.errorMessage = `Saisissez une adresse e-mail valide pour continuer avec ${this.getProviderLabel(provider)}.`;
      this.successMessage = '';
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.isSubmitting = true;

    this.authService.socialAuth({
      provider,
      mode: 'REGISTER',
      email,
      username: name,
      role: this.selectedRole,
      phoneNumber: this.registerForm.value.phone || '',
      fonction: this.registerForm.value.jobTitle || '',
      poste: this.registerForm.value.position || '',
      departement: this.registerForm.value.department || ''
    }).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.successMessage = response.message;

        if (response.token) {
          const targetRoute = this.authService.getRoleHomeRoute();
          this.router.navigate([targetRoute]);
          return;
        }

        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1500);
      },
      error: (error: Error) => {
        this.isSubmitting = false;
        this.errorMessage = error.message;
        this.successMessage = '';
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
