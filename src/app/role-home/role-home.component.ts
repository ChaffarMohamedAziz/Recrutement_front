import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HomeComponent } from '../home/home.component';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-role-home',
  standalone: true,
  imports: [CommonModule, HomeComponent],
  templateUrl: './role-home.component.html'
})
export class RoleHomeComponent implements OnInit {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      return;
    }

    const roleHomeRoute = this.authService.getRoleHomeRoute();

    if (!roleHomeRoute || roleHomeRoute === '/home') {
      return;
    }

    setTimeout(() => {
      void this.router.navigateByUrl(roleHomeRoute);
    });
  }
}
