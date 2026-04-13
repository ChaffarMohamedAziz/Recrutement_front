import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { BLOG_POSTS } from '../data/mock-market-data';
import { PageHeroComponent } from '../shared/page-hero/page-hero.component';

@Component({
  selector: 'app-blog-details',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeroComponent],
  templateUrl: './blog-details.component.html',
  styleUrl: './blog-details.component.css'
})
export class BlogDetailsComponent {
  readonly post;
  readonly relatedPosts;

  constructor(private route: ActivatedRoute) {
    this.post = BLOG_POSTS.find((item) => item.id === Number(this.route.snapshot.paramMap.get('id'))) ?? BLOG_POSTS[0];
    this.relatedPosts = BLOG_POSTS.filter((item) => item.id !== this.post.id).slice(0, 2);
  }
}
