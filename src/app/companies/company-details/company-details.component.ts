import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { COMPANIES, JOBS } from '../../data/mock-market-data';
import { PageHeroComponent } from '../../shared/page-hero/page-hero.component';

@Component({
  selector: 'app-company-details',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeroComponent],
  templateUrl: './company-details.component.html',
  styleUrl: './company-details.component.css'
})
export class CompanyDetailsComponent {
  readonly company = COMPANIES.find((item) => item.id === Number(this.route.snapshot.paramMap.get('id'))) ?? COMPANIES[0];
  readonly jobs = JOBS.filter((job) => job.companyId === this.company.id);

  constructor(private route: ActivatedRoute) {}
}
