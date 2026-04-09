import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import {
  CandidateEducationItem,
  CandidateProfileResponse,
  CandidateProfileService,
  CandidateSkillItem
} from '../services/candidate-profile.service';
import { CompetenceItem, CompetenceService } from '../services/competence.service';

@Component({
  selector: 'app-profile-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './profile-form.component.html',
  styleUrl: './profile-form.component.css'
})
export class ProfileFormComponent implements OnInit {
  isSaved = false;
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';
  selectedProfilePhotoName = '';
  selectedCoverPhotoName = '';
  selectedCvFileName = '';
  availableCompetences: CompetenceItem[] = [];
  readonly skillLevels = ['Debutant', 'Intermediaire', 'Avance', 'Expert'];
  private profilePhotoFile: File | null = null;
  private coverPhotoFile: File | null = null;
  private cvFile: File | null = null;
  readonly profileForm: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly candidateProfileService: CandidateProfileService,
    private readonly competenceService: CompetenceService
  ) {
    this.profileForm = this.fb.group({
      identity: this.fb.group({
        fullName: ['', Validators.required],
        profession: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        birthDate: [''],
        phone: [''],
        jobTitle: [''],
        address: [''],
        gender: ['homme'],
        description: ['']
      }),
      education: this.fb.array([this.createEducationGroup()]),
      skills: this.fb.array([this.createSkillGroup()]),
      socialLinks: this.fb.group({
        facebook: [''],
        instagram: [''],
        linkedin: [''],
        github: ['']
      })
    });
  }

  ngOnInit(): void {
    this.prefillCurrentUser();
    this.loadCompetences();
    this.loadCurrentProfile();
  }

  get identityGroup(): FormGroup {
    return this.profileForm.get('identity') as FormGroup;
  }

  get educationArray(): FormArray {
    return this.profileForm.get('education') as FormArray;
  }

  get skillsArray(): FormArray {
    return this.profileForm.get('skills') as FormArray;
  }

  addEducation(): void {
    this.educationArray.push(this.createEducationGroup());
  }

  addSkill(): void {
    this.skillsArray.push(this.createSkillGroup());
  }

  onSkillCompetenceChange(index: number): void {
    const skillGroup = this.skillsArray.at(index) as FormGroup;
    const competenceId = Number(skillGroup.get('competenceId')?.value);
    const selectedCompetence = this.availableCompetences.find((item) => item.id === competenceId);

    if (!selectedCompetence) {
      return;
    }

    skillGroup.patchValue({
      title: selectedCompetence.nom
    });
  }

  onProfilePhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    this.profilePhotoFile = file;
    this.selectedProfilePhotoName = file?.name || this.selectedProfilePhotoName;
  }

  onCoverPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    this.coverPhotoFile = file;
    this.selectedCoverPhotoName = file?.name || this.selectedCoverPhotoName;
  }

  onCvSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    this.cvFile = file;
    this.selectedCvFileName = file?.name || this.selectedCvFileName;
  }

  saveProfile(): void {
    if (this.isSaving || this.isLoading) {
      return;
    }

    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.errorMessage = 'Veuillez renseigner au minimum le nom complet, la profession et une adresse e-mail valide avant d\'enregistrer.';
      this.successMessage = '';
      return;
    }

    this.isSaved = false;
    this.errorMessage = '';
    this.successMessage = '';
    this.isSaving = true;

    this.candidateProfileService.saveCurrentProfile(
      {
        fullName: this.identityGroup.value.fullName || '',
        profession: this.identityGroup.value.profession || '',
        email: this.identityGroup.value.email || '',
        birthDate: this.identityGroup.value.birthDate || '',
        phone: this.identityGroup.value.phone || '',
        jobTitle: this.identityGroup.value.jobTitle || '',
        address: this.identityGroup.value.address || '',
        gender: this.identityGroup.value.gender || 'homme',
        description: this.identityGroup.value.description || '',
        education: this.educationArray.getRawValue() as CandidateEducationItem[],
        skills: this.skillsArray.getRawValue() as CandidateSkillItem[],
        socialLinks: this.profileForm.get('socialLinks')?.getRawValue()
      },
      {
        profilePhoto: this.profilePhotoFile,
        coverPhoto: this.coverPhotoFile,
        cvFile: this.cvFile
      }
    ).subscribe({
      next: (response) => {
        this.isSaving = false;
        this.isSaved = true;
        this.successMessage = 'Le profil candidat a ete enregistre avec succes.';
        this.authService.updateCurrentUser(response.fullName, response.email);
        this.patchProfile(response);
      },
      error: (error: { message: string }) => {
        this.isSaving = false;
        this.errorMessage = error.message;
      }
    });
  }

  private loadCurrentProfile(): void {
    this.isLoading = true;
    this.candidateProfileService.getCurrentProfile().subscribe({
      next: (response) => {
        this.isLoading = false;
        this.patchProfile(response);
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  private loadCompetences(): void {
    this.competenceService.getCompetences().subscribe({
      next: (items) => {
        this.availableCompetences = items;
      }
    });
  }

  private patchProfile(profile: CandidateProfileResponse): void {
    this.identityGroup.patchValue({
      fullName: profile.fullName || this.identityGroup.value.fullName,
      profession: profile.profession || '',
      email: profile.email || this.identityGroup.value.email,
      birthDate: profile.birthDate || '',
      phone: profile.phone || '',
      jobTitle: profile.jobTitle || '',
      address: profile.address || '',
      gender: profile.gender || 'homme',
      description: profile.description || ''
    });

    this.profileForm.get('socialLinks')?.patchValue({
      facebook: profile.facebook || '',
      instagram: profile.instagram || '',
      linkedin: profile.linkedin || '',
      github: profile.github || ''
    });

    this.replaceEducation(this.parseJsonArray<CandidateEducationItem>(profile.educationJson, this.defaultEducation()));
    this.replaceSkills(this.parseJsonArray<CandidateSkillItem>(profile.skillsJson, this.defaultSkill()));

    this.selectedProfilePhotoName = profile.profilePhotoName || '';
    this.selectedCoverPhotoName = profile.coverPhotoName || '';
    this.selectedCvFileName = profile.cvFileName || '';
  }

  private prefillCurrentUser(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return;
    }

    this.identityGroup.patchValue({
      fullName: currentUser.username || '',
      email: currentUser.email || ''
    });
  }

  private replaceEducation(items: CandidateEducationItem[]): void {
    this.educationArray.clear();
    items.forEach((item) => {
      this.educationArray.push(
        this.fb.group({
          title: [item.title || ''],
          degree: [item.degree || ''],
          institute: [item.institute || ''],
          year: [item.year || '']
        })
      );
    });

    if (!this.educationArray.length) {
      this.educationArray.push(this.createEducationGroup());
    }
  }

  private replaceSkills(items: CandidateSkillItem[]): void {
    this.skillsArray.clear();
    items.forEach((item) => {
      this.skillsArray.push(
        this.fb.group({
          competenceId: [item.competenceId ?? null],
          title: [item.title || ''],
          level: [item.level || 'Intermediaire'],
          yearsExperience: [item.yearsExperience || '1 an'],
          percentage: [item.percentage ?? 70]
        })
      );
    });

    if (!this.skillsArray.length) {
      this.skillsArray.push(this.createSkillGroup());
    }
  }

  private parseJsonArray<T>(value: string, fallbackItem: T): T[] {
    if (!value) {
      return [fallbackItem];
    }

    try {
      const parsed = JSON.parse(value) as T[];
      return Array.isArray(parsed) && parsed.length ? parsed : [fallbackItem];
    } catch {
      return [fallbackItem];
    }
  }

  private defaultEducation(): CandidateEducationItem {
    return {
      title: '',
      degree: '',
      institute: '',
      year: ''
    };
  }

  private defaultSkill(): CandidateSkillItem {
    return {
      competenceId: null,
      title: '',
      level: 'Intermediaire',
      yearsExperience: '1 an',
      percentage: 70
    };
  }

  private createEducationGroup(): FormGroup {
    return this.fb.group({
      title: [''],
      degree: [''],
      institute: [''],
      year: ['']
    });
  }

  private createSkillGroup(): FormGroup {
    return this.fb.group({
      competenceId: [null],
      title: [''],
      level: ['Intermediaire'],
      yearsExperience: ['1 an'],
      percentage: [70]
    });
  }
}
