import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { PageHeroComponent } from '../shared/page-hero/page-hero.component';

interface SimplePageData {
  title: string;
  badge: string;
  description: string;
  primaryLabel: string;
  primaryLink: string;
  secondaryLabel: string;
  secondaryLink: string;
  features: string[];
}

@Component({
  selector: 'app-simple-page',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeroComponent],
  templateUrl: './simple-page.component.html',
  styleUrl: './simple-page.component.css'
})
export class SimplePageComponent {
  readonly pageData: SimplePageData;

  constructor(private route: ActivatedRoute) {
    this.pageData = this.route.snapshot.data as SimplePageData;
  }
}
