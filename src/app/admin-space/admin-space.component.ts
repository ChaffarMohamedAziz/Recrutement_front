import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-admin-space',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-space.component.html',
  styleUrl: './admin-space.component.css'
})
export class AdminSpaceComponent {
  readonly user;

  readonly kpis = [
    { label: 'Demandes a valider', value: '12', detail: 'Recruteurs en attente' },
    { label: 'Utilisateurs actifs', value: '248', detail: 'Candidats et recruteurs' },
    { label: 'Actions systeme', value: '37', detail: 'Mises a jour recentes' }
  ];

  readonly recentActivities = [
    { title: 'Validation recruteurs', subtitle: '4 comptes en attente de verification', value: 'A traiter' },
    { title: 'Gestion utilisateurs', subtitle: 'Acces rapide a la liste des comptes', value: 'Ouvert' },
    { title: 'Parametres plateforme', subtitle: 'Configuration generale du systeme', value: 'Pret' }
  ];

  readonly topSkills = [
    { title: 'Demandes recruteurs', percent: 'Priorite haute' },
    { title: 'Utilisateurs', percent: 'Suivi actif' },
    { title: 'Notifications', percent: 'En temps reel' },
    { title: 'Statistiques', percent: 'Disponible' }
  ];

  constructor(private readonly authService: AuthService) {
    this.user = this.authService.getCurrentUser();
  }
}
