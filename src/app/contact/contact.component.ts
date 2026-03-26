import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css'
})
export class ContactComponent {
  readonly contactForm;
  isSubmitted = false;

  readonly contactCards = [
    {
      title: 'Adresse e-mail',
      value: 'contact@smartrecruit.local',
      note: 'Reponse sous 24 heures ouvrables'
    },
    {
      title: 'Telephone',
      value: '+216 70 000 000',
      note: 'Du lundi au vendredi de 8h a 18h'
    },
    {
      title: 'Adresse',
      value: 'Centre Urbain Nord, Tunis',
      note: 'Espace entreprise et accompagnement RH'
    }
  ];

  constructor(private fb: FormBuilder) {
    this.contactForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      subject: ['', Validators.required],
      message: ['', [Validators.required, Validators.minLength(12)]]
    });
  }

  onSubmit(): void {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    this.isSubmitted = true;
    this.contactForm.reset();
  }
}
