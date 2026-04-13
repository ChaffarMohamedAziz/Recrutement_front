import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { COMPANIES } from '../../data/mock-market-data';
import { PageHeroComponent } from '../../shared/page-hero/page-hero.component';

@Component({
  selector: 'app-company-list',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeroComponent],
  templateUrl: './company-list.component.html',
  styleUrl: './company-list.component.css'
})
export class CompanyListComponent {
  readonly companies = COMPANIES;
}
