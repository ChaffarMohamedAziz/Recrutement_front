import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import {
  CandidateExperienceItem,
  CandidateProfileAutofillResponse,
  CandidateEducationItem,
  CandidateProfileResponse,
  CandidateProfileService,
  CandidateSkillItem
} from '../services/candidate-profile.service';
import { CompetenceItem, CompetenceService } from '../services/competence.service';
import { PageHeroComponent } from '../shared/page-hero/page-hero.component';

@Component({
  selector: 'app-profile-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, PageHeroComponent],
  templateUrl: './profile-form.component.html',
  styleUrl: './profile-form.component.css'
})
export class ProfileFormComponent implements OnInit, OnDestroy {
  private static readonly MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
  private static readonly MAX_CV_SIZE_BYTES = 10 * 1024 * 1024;
  isSaved = false;
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';
  isAutofillingCv = false;
  selectedProfilePhotoName = '';
  selectedCoverPhotoName = '';
  selectedCvFileName = '';
  profilePhotoPreviewUrl = '';
  coverPhotoPreviewUrl = '';
  availableCompetences: CompetenceItem[] = [];
  readonly skillLevels = ['Debutant', 'Intermediaire', 'Avance', 'Expert'];
  private profilePhotoFile: File | null = null;
  private coverPhotoFile: File | null = null;
  private cvFile: File | null = null;
  private localProfilePreviewUrl = '';
  private localCoverPreviewUrl = '';
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
      experiences: this.fb.array([this.createExperienceGroup()]),
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

  ngOnDestroy(): void {
    this.revokeLocalPreview('profile');
    this.revokeLocalPreview('cover');
  }

  get identityGroup(): FormGroup {
    return this.profileForm.get('identity') as FormGroup;
  }

  get educationArray(): FormArray {
    return this.profileForm.get('education') as FormArray;
  }

  get experiencesArray(): FormArray {
    return this.profileForm.get('experiences') as FormArray;
  }

  get skillsArray(): FormArray {
    return this.profileForm.get('skills') as FormArray;
  }

  get candidateInitials(): string {
    const value = this.identityGroup.get('fullName')?.value || 'CA';
    return value
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((item: string) => item.charAt(0).toUpperCase())
      .join('');
  }

  get completionRate(): number {
    const identity = this.identityGroup.getRawValue();
    const checks = [
      !!identity.fullName,
      !!identity.profession,
      !!identity.email,
      !!identity.phone,
      !!identity.jobTitle,
      !!identity.address,
      !!identity.description,
      !!this.profilePhotoPreviewUrl,
      !!this.coverPhotoPreviewUrl,
      !!this.selectedCvFileName,
      this.skillsArray.controls.some((control) => !!control.get('title')?.value || !!control.get('competenceId')?.value),
      this.educationArray.controls.some((control) => !!control.get('degree')?.value || !!control.get('title')?.value),
      this.experiencesArray.controls.some((control) => !!control.get('title')?.value || !!control.get('company')?.value),
      this.hasSocialLinks
    ];

    const filled = checks.filter(Boolean).length;
    return Math.round((filled / checks.length) * 100);
  }

  get completionTone(): 'success' | 'warning' | 'danger' {
    if (this.completionRate >= 80) {
      return 'success';
    }

    if (this.completionRate >= 50) {
      return 'warning';
    }

    return 'danger';
  }

  get profileLocation(): string {
    return this.identityGroup.get('address')?.value || 'Localisation a completer';
  }

  get profileJobTitle(): string {
    return this.identityGroup.get('jobTitle')?.value || this.identityGroup.get('profession')?.value || 'Poste recherche a preciser';
  }

  get profileSummary(): string {
    return this.identityGroup.get('description')?.value || 'Ajoutez un resume professionnel clair pour renforcer votre visibilite.';
  }

  get visibleSkills(): CandidateSkillItem[] {
    const seen = new Set<string>();
    return this.skillsArray.getRawValue()
      .filter((item: CandidateSkillItem) => !!item.title || !!item.competenceId)
      .filter((item: CandidateSkillItem) => {
        const key = item.competenceId
          ? `id:${item.competenceId}`
          : `title:${this.normalizeSkillKey(item.title || '')}`;
        if (!key || seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      })
      .slice(0, 8);
  }

  get visibleExperiencesCount(): number {
    return this.experiencesArray.getRawValue()
      .filter((item: CandidateExperienceItem) => !!item.title || !!item.company)
      .length;
  }

  get visibleEducationCount(): number {
    return this.educationArray.getRawValue()
      .filter((item: CandidateEducationItem) => !!item.degree || !!item.title)
      .length;
  }

  get hasSocialLinks(): boolean {
    const socialLinks = this.profileForm.get('socialLinks')?.getRawValue();
    return !!(socialLinks?.facebook || socialLinks?.instagram || socialLinks?.linkedin || socialLinks?.github);
  }

  get socialLinkEntries(): Array<{ label: string; value: string }> {
    const socialLinks = this.profileForm.get('socialLinks')?.getRawValue();
    return [
      { label: 'Facebook', value: socialLinks?.facebook || '' },
      { label: 'Instagram', value: socialLinks?.instagram || '' },
      { label: 'LinkedIn', value: socialLinks?.linkedin || '' },
      { label: 'GitHub', value: socialLinks?.github || '' }
    ].filter((item) => !!item.value);
  }

  addExperience(): void {
    this.experiencesArray.push(this.createExperienceGroup());
  }

  removeExperience(index: number): void {
    this.removeFormArrayItem(this.experiencesArray, index, () => this.createExperienceGroup());
  }

  addEducation(): void {
    this.educationArray.push(this.createEducationGroup());
  }

  removeEducation(index: number): void {
    this.removeFormArrayItem(this.educationArray, index, () => this.createEducationGroup());
  }

  addSkill(): void {
    this.skillsArray.push(this.createSkillGroup());
  }

  removeSkill(index: number): void {
    this.removeFormArrayItem(this.skillsArray, index, () => this.createSkillGroup());
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

  onSkillTitleInput(index: number): void {
    const skillGroup = this.skillsArray.at(index) as FormGroup;
    const title = `${skillGroup.get('title')?.value || ''}`.trim();
    const matchedCompetence = this.availableCompetences.find(
      (item) => this.normalizeSkillKey(item.nom) === this.normalizeSkillKey(title)
    );

    skillGroup.patchValue(
      {
        competenceId: matchedCompetence?.id ?? null,
        title
      },
      { emitEvent: false }
    );
  }

  onProfilePhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    if (!this.acceptSelectedFile(file, input, ProfileFormComponent.MAX_IMAGE_SIZE_BYTES, 'La photo de profil')) {
      return;
    }
    this.profilePhotoFile = file;
    this.selectedProfilePhotoName = file?.name || this.selectedProfilePhotoName;
    if (file) {
      this.revokeLocalPreview('profile');
      this.localProfilePreviewUrl = URL.createObjectURL(file);
      this.profilePhotoPreviewUrl = this.localProfilePreviewUrl;
    }
  }

  onCoverPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    if (!this.acceptSelectedFile(file, input, ProfileFormComponent.MAX_IMAGE_SIZE_BYTES, 'La photo de couverture')) {
      return;
    }
    this.coverPhotoFile = file;
    this.selectedCoverPhotoName = file?.name || this.selectedCoverPhotoName;
    if (file) {
      this.revokeLocalPreview('cover');
      this.localCoverPreviewUrl = URL.createObjectURL(file);
      this.coverPhotoPreviewUrl = this.localCoverPreviewUrl;
    }
  }

  onCvSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    if (!this.acceptSelectedFile(file, input, ProfileFormComponent.MAX_CV_SIZE_BYTES, 'Le CV')) {
      return;
    }
    this.cvFile = file;
    this.selectedCvFileName = file?.name || this.selectedCvFileName;
    if (!file) {
      return;
    }

    this.isAutofillingCv = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.candidateProfileService.extractProfileFromCv(file).subscribe({
      next: (response) => {
        this.isAutofillingCv = false;
        this.applyAutofill(response);
        this.loadCompetences();
        this.successMessage = response.message || 'Le CV a ete analyse et les champs du profil ont ete pre-remplis.';
      },
      error: (error: { message: string }) => {
        this.isAutofillingCv = false;
        this.errorMessage = error.message;
      }
    });
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
        experiences: this.experiencesArray.getRawValue() as CandidateExperienceItem[],
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
        this.loadCompetences();
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
      error: (error: { message?: string }) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Chargement du profil candidat impossible.';
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
    this.replaceExperiences(this.parseJsonArray<CandidateExperienceItem>(profile.experienceJson, this.defaultExperience()));
    this.replaceSkills(this.parseJsonArray<CandidateSkillItem>(profile.skillsJson, this.defaultSkill()));

    this.selectedProfilePhotoName = profile.profilePhotoName || '';
    this.selectedCoverPhotoName = profile.coverPhotoName || '';
    this.selectedCvFileName = profile.cvFileName || '';
    this.revokeLocalPreview('profile');
    this.revokeLocalPreview('cover');
    this.profilePhotoPreviewUrl = profile.profilePhotoUrl || '';
    this.coverPhotoPreviewUrl = profile.coverPhotoUrl || '';
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

  private replaceExperiences(items: CandidateExperienceItem[]): void {
    this.experiencesArray.clear();
    items.forEach((item) => {
      this.experiencesArray.push(
        this.fb.group({
          title: [item.title || ''],
          company: [item.company || ''],
          location: [item.location || ''],
          period: [item.period || ''],
          description: [item.description || '']
        })
      );
    });

    if (!this.experiencesArray.length) {
      this.experiencesArray.push(this.createExperienceGroup());
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

  private applyAutofill(autofill: CandidateProfileAutofillResponse): void {
    this.identityGroup.patchValue({
      fullName: autofill.fullName || this.identityGroup.value.fullName,
      profession: autofill.profession || this.identityGroup.value.profession,
      email: autofill.email || this.identityGroup.value.email,
      phone: autofill.phone || this.identityGroup.value.phone,
      jobTitle: autofill.jobTitle || this.identityGroup.value.jobTitle,
      address: autofill.address || this.identityGroup.value.address,
      description: autofill.description || this.identityGroup.value.description
    });

    if (autofill.experiences?.length) {
      this.replaceExperiences(autofill.experiences);
    }

    if (autofill.education?.length) {
      this.replaceEducation(autofill.education);
    }

    if (autofill.skills?.length) {
      this.replaceSkills(this.mergeSkills(
        this.skillsArray.getRawValue() as CandidateSkillItem[],
        autofill.skills
      ));
    }
  }

  private mergeSkills(current: CandidateSkillItem[], incoming: CandidateSkillItem[]): CandidateSkillItem[] {
    const merged = new Map<string, CandidateSkillItem>();
    [...current, ...incoming].forEach((item) => {
      if (!item || (!item.title && !item.competenceId)) {
        return;
      }

      const normalized: CandidateSkillItem = {
        competenceId: item.competenceId ?? null,
        title: (item.title || '').trim(),
        level: item.level || 'Intermediaire',
        yearsExperience: item.yearsExperience || '1 an',
        percentage: item.percentage ?? 70
      };

      const key = normalized.competenceId
        ? `id:${normalized.competenceId}`
        : `title:${this.normalizeSkillKey(normalized.title)}`;

      if (!key || key.endsWith(':')) {
        return;
      }

      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, normalized);
        return;
      }

      existing.percentage = Math.max(existing.percentage ?? 0, normalized.percentage ?? 0);
      existing.level = this.skillLevels.indexOf(normalized.level || 'Intermediaire') > this.skillLevels.indexOf(existing.level || 'Intermediaire')
        ? normalized.level
        : existing.level;
      existing.yearsExperience = existing.yearsExperience || normalized.yearsExperience;
      existing.title = existing.title || normalized.title;
      existing.competenceId = existing.competenceId ?? normalized.competenceId ?? null;
    });

    return merged.size ? Array.from(merged.values()) : [this.defaultSkill()];
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

  private defaultExperience(): CandidateExperienceItem {
    return {
      title: '',
      company: '',
      location: '',
      period: '',
      description: ''
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

  private createExperienceGroup(): FormGroup {
    return this.fb.group({
      title: [''],
      company: [''],
      location: [''],
      period: [''],
      description: ['']
    });
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

  private revokeLocalPreview(type: 'profile' | 'cover'): void {
    if (type === 'profile' && this.localProfilePreviewUrl) {
      URL.revokeObjectURL(this.localProfilePreviewUrl);
      this.localProfilePreviewUrl = '';
      return;
    }

    if (type === 'cover' && this.localCoverPreviewUrl) {
      URL.revokeObjectURL(this.localCoverPreviewUrl);
      this.localCoverPreviewUrl = '';
    }
  }

  private acceptSelectedFile(
    file: File | null,
    input: HTMLInputElement,
    maxSizeBytes: number,
    fileLabel: string
  ): boolean {
    if (!file) {
      return false;
    }

    if (file.size > maxSizeBytes) {
      input.value = '';
      this.errorMessage = `${fileLabel} est trop volumineux. Taille maximale autorisee : ${this.formatFileSize(maxSizeBytes)}.`;
      this.successMessage = '';
      this.isAutofillingCv = false;
      return false;
    }

    this.errorMessage = '';
    return true;
  }

  private formatFileSize(sizeInBytes: number): string {
    if (sizeInBytes < 1024 * 1024) {
      return `${Math.round(sizeInBytes / 1024)} Ko`;
    }
    return `${Math.round((sizeInBytes / (1024 * 1024)) * 10) / 10} Mo`;
  }

  private normalizeSkillKey(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9+/#.]/g, '');
  }

  private removeFormArrayItem(array: FormArray, index: number, fallbackFactory: () => FormGroup): void {
    if (index < 0 || index >= array.length) {
      return;
    }

    array.removeAt(index);
    if (!array.length) {
      array.push(fallbackFactory());
    }
  }
}
