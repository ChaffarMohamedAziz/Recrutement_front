import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-upload-resume',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './upload-resume.component.html',
  styleUrl: './upload-resume.component.css'
})
export class UploadResumeComponent {
  selectedFileName = '';
  uploadMessage = '';

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      this.selectedFileName = '';
      return;
    }

    this.selectedFileName = file.name;
    this.uploadMessage = '';
  }

  submitResume(): void {
    if (!this.selectedFileName) {
      this.uploadMessage = 'Veuillez choisir un fichier CV avant de continuer.';
      return;
    }

    this.uploadMessage = `Votre CV "${this.selectedFileName}" a ete prepare pour l'envoi. Je peux maintenant le relier au backend si vous voulez un vrai upload serveur.`;
  }
}
