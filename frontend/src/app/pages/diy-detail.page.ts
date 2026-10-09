import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ApiService } from '../api.service';
import { DiyGuide } from '../models';

@Component({
  selector: 'app-diy-detail-page',
  imports: [RouterLink],
  templateUrl: './diy-detail.page.html',
  styleUrl: './diy-detail.page.css'
})
export class DiyDetailPage {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);

  readonly guide = signal<DiyGuide | null>(null);
  readonly error = signal('');
  readonly videoUrl = computed<SafeResourceUrl | null>(() => {
    const guide = this.guide();
    if (!guide) {
      return null;
    }
    const url = guide.youtubeVideoId
      ? `https://www.youtube.com/embed/${guide.youtubeVideoId}`
      : `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(guide.youtubeSearch)}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Missing DIY id');
      return;
    }
    this.api.diyById(id).subscribe({
      next: (guide) => this.guide.set(guide),
      error: () => this.error.set('Could not load this DIY.')
    });
  }
}
