import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';

export interface PageHeroBreadcrumb {
  label: string;
  link?: string;
}

export interface PageHeroHighlight {
  title: string;
  description: string;
  icon?: 'briefcase' | 'users' | 'speed' | 'shield' | 'spark' | 'chart' | 'search' | 'check';
}

export type PageHeroVariant =
  | 'insight'
  | 'support'
  | 'analytics'
  | 'journey'
  | 'opportunities'
  | 'publish'
  | 'workflow'
  | 'talent'
  | 'communication'
  | 'settings'
  | 'taxonomy'
  | 'enterprise'
  | 'approval'
  | 'management'
  | 'upload'
  | 'profile';

@Component({
  selector: 'app-page-hero',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './page-hero.component.html',
  styleUrl: './page-hero.component.css'
})
export class PageHeroComponent {
  @Input() badge = '';
  @Input() title = '';
  @Input() subtitle = '';
  @Input() theme: 'public' | 'admin' | 'recruiter' | 'candidate' = 'public';
  @Input() variant: PageHeroVariant = 'insight';
  @Input() breadcrumbs: PageHeroBreadcrumb[] = [];
  @Input() highlights: PageHeroHighlight[] = [];
  @Input() primaryActionLabel = '';
  @Input() primaryActionLink = '';
  @Input() secondaryActionLabel = '';
  @Input() secondaryActionLink = '';
}
