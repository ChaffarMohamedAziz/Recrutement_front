import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-profile-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './profile-form.component.html',
  styleUrl: './profile-form.component.css'
})
export class ProfileFormComponent {
  isSaved = false;
  readonly profileForm: FormGroup;

  constructor(private fb: FormBuilder) {
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
      education: this.fb.array([
        this.createEducationGroup()
      ]),
      skills: this.fb.array([
        this.createSkillGroup()
      ]),
      socialLinks: this.fb.group({
        facebook: [''],
        instagram: [''],
        linkedin: [''],
        github: ['']
      })
    });
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

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isSaved = true;
  }

  private createEducationGroup() {
    return this.fb.group({
      title: [''],
      degree: [''],
      institute: [''],
      year: ['']
    });
  }

  private createSkillGroup() {
    return this.fb.group({
      title: [''],
      percentage: [70]
    });
  }
}
