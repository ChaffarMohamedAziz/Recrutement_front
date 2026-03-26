import { AboutComponent } from './about/about.component';
import { Routes } from '@angular/router';
import { AccessDeniedComponent } from './auth/access-denied/access-denied.component';
import { adminGuard, authGuard } from './auth/access.guard';
import { ForgotPasswordComponent } from './auth/forgot-password/forgot-password.component';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { ResetPasswordComponent } from './auth/reset-password/reset-password.component';
import { VerifyEmailComponent } from './auth/verify-email/verify-email.component';
import { BlogDetailsComponent } from './blog/blog-details.component';
import { BlogListComponent } from './blog/blog-list.component';
import { CandidateDetailsComponent } from './candidates/candidate-details/candidate-details.component';
import { CandidateListComponent } from './candidates/candidate-list/candidate-list.component';
import { CompanyDetailsComponent } from './companies/company-details/company-details.component';
import { CompanyListComponent } from './companies/company-list/company-list.component';
import { ContactComponent } from './contact/contact.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { HomeComponent } from './home/home.component';
import { SimplePageComponent } from './info/simple-page.component';
import { ProfileFormComponent } from './profile/profile-form.component';
import { UploadResumeComponent } from './resume/upload-resume.component';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'about', component: AboutComponent },
  { path: 'login', component: LoginComponent },
  { path: 'auth/login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'auth/register', component: RegisterComponent },
  { path: 'verify-email', component: VerifyEmailComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'access-denied', component: AccessDeniedComponent },
  { path: 'home', component: HomeComponent },
  {
    path: 'job-list',
    component: SimplePageComponent,
    canActivate: [authGuard],
    data: {
      badge: 'Emplois',
      title: 'Liste des emplois',
      description: 'Parcourez les offres disponibles et accedez rapidement aux postes les plus pertinents.',
      primaryLabel: 'Voir l accueil',
      primaryLink: '/home',
      secondaryLabel: 'Voir les entreprises',
      secondaryLink: '/company-list',
      features: ['Recherche multicritere', 'Offres organisees', 'Navigation rapide']
    }
  },
  {
    path: 'job-details',
    component: SimplePageComponent,
    canActivate: [authGuard],
    data: {
      badge: 'Emplois',
      title: 'Details d un emploi',
      description: 'Cette page est prete pour afficher la fiche detaillee d une offre et ses criteres de selection.',
      primaryLabel: 'Retour aux emplois',
      primaryLink: '/job-list',
      secondaryLabel: 'Voir les candidats',
      secondaryLink: '/candidate-list',
      features: ['Description complete', 'Competences attendues', 'Actions de candidature']
    }
  },
  {
    path: 'post-a-job',
    component: SimplePageComponent,
    canActivate: [adminGuard],
    data: {
      badge: 'Recruteur',
      title: 'Publier une offre',
      description: 'Preparez la publication d une offre emploi avec une presentation claire et professionnelle.',
      primaryLabel: 'Creer un compte',
      primaryLink: '/register',
      secondaryLabel: 'Aller au tableau ATS',
      secondaryLink: '/dashboard',
      features: ['Titre et mission', 'Competences demandees', 'Publication rapide']
    }
  },
  { path: 'company-list', component: CompanyListComponent, canActivate: [adminGuard] },
  { path: 'company-details/:id', component: CompanyDetailsComponent, canActivate: [adminGuard] },
  { path: 'candidate-list', component: CandidateListComponent, canActivate: [adminGuard] },
  { path: 'candidate-details/:id', component: CandidateDetailsComponent, canActivate: [adminGuard] },
  {
    path: 'submit-resume',
    component: UploadResumeComponent,
    canActivate: [authGuard],
  },
  {
    path: 'pricing',
    component: SimplePageComponent,
    canActivate: [adminGuard],
    data: {
      badge: 'Tarification',
      title: 'Nos formules et services',
      description: 'Affichez ici les plans candidats et recruteurs selon vos besoins metier.',
      primaryLabel: 'Nous contacter',
      primaryLink: '/contact',
      secondaryLabel: 'Retour accueil',
      secondaryLink: '/home',
      features: ['Formules entreprise', 'Services premium', 'Accompagnement RH']
    }
  },
  {
    path: 'profile',
    component: ProfileFormComponent,
    canActivate: [authGuard],
  },
  {
    path: 'faq',
    component: SimplePageComponent,
    canActivate: [adminGuard],
    data: {
      badge: 'FAQ',
      title: 'Questions frequentes',
      description: 'Retrouvez les reponses aux questions les plus courantes sur le recrutement et la plateforme.',
      primaryLabel: 'Nous contacter',
      primaryLink: '/contact',
      secondaryLabel: 'Retour accueil',
      secondaryLink: '/home',
      features: ['Compte candidat', 'Compte recruteur', 'Support et activation']
    }
  },
  {
    path: 'terms-and-conditions',
    component: SimplePageComponent,
    canActivate: [adminGuard],
    data: {
      badge: 'Conditions',
      title: 'Conditions d utilisation',
      description: 'Une page dediee aux conditions d utilisation de la plateforme Smart Recruit.',
      primaryLabel: 'Politique de confidentialite',
      primaryLink: '/privacy-policy',
      secondaryLabel: 'Retour accueil',
      secondaryLink: '/home',
      features: ['Regles d usage', 'Responsabilites', 'Acces a la plateforme']
    }
  },
  {
    path: 'privacy-policy',
    component: SimplePageComponent,
    canActivate: [adminGuard],
    data: {
      badge: 'Confidentialite',
      title: 'Politique de confidentialite',
      description: 'Presentez ici la gestion des donnees, la securite et le traitement des informations utilisateurs.',
      primaryLabel: 'Conditions d utilisation',
      primaryLink: '/terms-and-conditions',
      secondaryLabel: 'Retour accueil',
      secondaryLink: '/home',
      features: ['Protection des donnees', 'Usage des informations', 'Consentement']
    }
  },
  { path: 'blog', component: BlogListComponent },
  { path: 'blog-details/:id', component: BlogDetailsComponent },
  { path: 'contact', component: ContactComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [adminGuard] }
];
