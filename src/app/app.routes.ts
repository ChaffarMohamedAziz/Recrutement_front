import { AdminSpaceComponent } from './admin-space/admin-space.component';
import { RecruiterActivationComponent } from './admin/recruiter-activation/recruiter-activation.component';
import { UserDetailComponent } from './admin/user-detail/user-detail.component';
import { UserListComponent } from './admin/user-list/user-list.component';
import { TagsComponent } from './admin/tags/tags.component';
import { AboutComponent } from './about/about.component';
import { Routes } from '@angular/router';
import { AccessDeniedComponent } from './auth/access-denied/access-denied.component';
import { adminGuard, candidateGuard, recruiterGuard } from './auth/access.guard';
import { ForgotPasswordComponent } from './auth/forgot-password/forgot-password.component';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { ResetPasswordComponent } from './auth/reset-password/reset-password.component';
import { VerifyEmailComponent } from './auth/verify-email/verify-email.component';
import { BlogDetailsComponent } from './blog/blog-details.component';
import { BlogListComponent } from './blog/blog-list.component';
import { CandidateSpaceComponent } from './candidate-space/candidate-space.component';
import { CandidateDetailsComponent } from './candidates/candidate-details/candidate-details.component';
import { CandidateListComponent } from './candidates/candidate-list/candidate-list.component';
import { CompanyDetailsComponent } from './companies/company-details/company-details.component';
import { CompanyListComponent } from './companies/company-list/company-list.component';
import { ContactComponent } from './contact/contact.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { HomeComponent } from './home/home.component';
import { SimplePageComponent } from './info/simple-page.component';
import { JobDetailsComponent } from './jobs/job-details.component';
import { JobListComponent } from './jobs/job-list.component';
import { PostJobComponent } from './jobs/post-job.component';
import { ProfileFormComponent } from './profile/profile-form.component';
import { RecruiterSpaceComponent } from './recruiter-space/recruiter-space.component';
import { UploadResumeComponent } from './resume/upload-resume.component';
import { RoleHomeComponent } from './role-home/role-home.component';

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
  { path: 'home', component: RoleHomeComponent },
  { path: 'public-home', component: HomeComponent },
  { path: 'candidate-space', component: CandidateSpaceComponent, canActivate: [candidateGuard] },
  { path: 'admin-dashboard', component: AdminSpaceComponent, canActivate: [adminGuard] },
  { path: 'admin/recruiter-activation', component: RecruiterActivationComponent, canActivate: [adminGuard] },
  { path: 'admin/users', component: UserListComponent, canActivate: [adminGuard] },
  { path: 'admin/tags', component: TagsComponent, canActivate: [adminGuard] },
  { path: 'admin/users/:id', component: UserDetailComponent, canActivate: [adminGuard] },
  { path: 'recruiter-space', component: RecruiterSpaceComponent, canActivate: [recruiterGuard] },
  {
    path: 'job-list',
    component: JobListComponent,
    canActivate: [candidateGuard],
  },
  { path: 'job-details', redirectTo: 'job-list', pathMatch: 'full' },
  { path: 'job-details/:id', component: JobDetailsComponent, canActivate: [candidateGuard] },
  {
    path: 'post-a-job',
    component: PostJobComponent,
    canActivate: [recruiterGuard],
  },
  { path: 'company-list', component: CompanyListComponent, canActivate: [adminGuard] },
  { path: 'company-details/:id', component: CompanyDetailsComponent, canActivate: [adminGuard] },
  { path: 'candidate-list', component: CandidateListComponent, canActivate: [recruiterGuard] },
  { path: 'candidate-details/:id', component: CandidateDetailsComponent, canActivate: [recruiterGuard] },
  {
    path: 'submit-resume',
    component: UploadResumeComponent,
    canActivate: [candidateGuard],
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
    canActivate: [candidateGuard],
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
  { path: 'dashboard', component: DashboardComponent, canActivate: [recruiterGuard] }
];
