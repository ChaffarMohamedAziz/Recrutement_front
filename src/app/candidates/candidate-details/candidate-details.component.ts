import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CANDIDATES } from '../../data/mock-market-data';

@Component({
  selector: 'app-candidate-details',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './candidate-details.component.html',
  styleUrl: './candidate-details.component.css'
})
export class CandidateDetailsComponent {
  readonly candidate = CANDIDATES.find((item) => item.id === Number(this.route.snapshot.paramMap.get('id'))) ?? CANDIDATES[0];

  constructor(private route: ActivatedRoute) {}
}
