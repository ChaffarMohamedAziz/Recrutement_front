import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ContactService } from '../services/contact.service';
import { PageHeroComponent } from '../shared/page-hero/page-hero.component';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, PageHeroComponent],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css'
})
export class ContactComponent {
  readonly contactForm;
  isSubmitting = false;
  successMessage = '';
  errorMessage = '';

  readonly contactCards = [
    {
      title: 'Adresse e-mail',
      value: 'chaffaraziz54@gmail.com',
      note: 'Réponse sous 24 heures ouvrables'
    },
    {
      title: 'Téléphone',
      value: '+216 70 000 000',
      note: 'Du lundi au vendredi de 8h à 18h'
    },
    {
      title: 'Adresse',
      value: 'Centre Urbain Nord, Tunis',
      note: 'Espace entreprise et accompagnement RH'
    }
  ];

  constructor(
    private fb: FormBuilder,
    private contactService: ContactService
  ) {
    this.contactForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      subject: ['', Validators.required],
      message: ['', [Validators.required, Validators.minLength(12)]]
    });
  }

  envoyerMessage(): void {
    this.successMessage = '';
    this.errorMessage = '';

    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      this.errorMessage = 'Veuillez remplir tous les champs.';
      return;
    }

    const value = this.contactForm.getRawValue();
    this.isSubmitting = true;

    this.contactService.envoyerMessageContact({
      nom: value.fullName || '',
      fullName: value.fullName || '',
      email: value.email || '',
      subject: value.subject || '',
      message: value.message || ''
    }).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.successMessage = response.message || 'Votre message a été envoyé avec succès.';
        this.contactForm.reset();
      },
      error: () => {
        this.isSubmitting = false;
        this.errorMessage = 'Erreur lors de l’envoi du message. Veuillez réessayer.';
      }
    });
  }

  onSubmit(): void {
    this.envoyerMessage();
  }
}
