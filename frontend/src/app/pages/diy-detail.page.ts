import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
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

  /** Returns a context-aware SVG icon for a step based on its text. */
  getStepIcon(step: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(pickStepIcon(step));
  }
}

// ─── Step icon helper ────────────────────────────────────────────────────────

const STEP_ICONS: Array<{ keywords: string[]; svg: string }> = [
  {
    keywords: ['cut', 'trim', 'slice', 'snip', 'scissors'],
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
      <line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/>
      <line x1="8.12" y1="8.12" x2="12" y2="12"/>
    </svg>`
  },
  {
    keywords: ['glue', 'stick', 'attach', 'bond', 'adhesive', 'tape'],
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 22V12"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/>
      <rect x="8" y="2" width="8" height="10" rx="2"/>
    </svg>`
  },
  {
    keywords: ['drill', 'screw', 'bolt', 'nail', 'hammer', 'punch', 'hole'],
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="m14 6-1-2H5v16h2v-6h5l1 2h7V8h-6Z"/>
    </svg>`
  },
  {
    keywords: ['paint', 'colour', 'color', 'coat', 'spray', 'brush', 'decorate'],
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M19 3H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h3l3 8 3-8h5a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z"/>
      <line x1="12" y1="11" x2="12" y2="19"/>
    </svg>`
  },
  {
    keywords: ['fold', 'crease', 'bend'],
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>`
  },
  {
    keywords: ['fill', 'pour', 'add water', 'insert', 'place', 'put', 'pack', 'stuff'],
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2v6"/><path d="m9.17 4.83 2.83 2.83 2.83-2.83"/>
      <path d="M6 8a6 6 0 1 0 12 0"/>
      <rect x="5" y="16" width="14" height="6" rx="2"/>
    </svg>`
  },
  {
    keywords: ['wash', 'clean', 'rinse', 'dry', 'wipe', 'remove dirt', 'soak'],
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05Z"/>
      <path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"/>
    </svg>`
  },
  {
    keywords: ['measure', 'mark', 'ruler', 'tape measure', 'line'],
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21.3 8.7 8.7 21.3c-1 1-2.5 1-3.4 0l-2.6-2.6c-1-1-1-2.5 0-3.4L15.3 2.7c1-1 2.5-1 3.4 0l2.6 2.6c1 1 1 2.5 0 3.4Z"/>
      <path d="m7.5 10.5 2 2"/><path d="m10.5 7.5 2 2"/><path d="m13.5 4.5 2 2"/><path d="m4.5 13.5 2 2"/>
    </svg>`
  },
  {
    keywords: ['wrap', 'cover', 'seal', 'close', 'cap', 'lid'],
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z"/>
      <path d="M12 3v4"/><path d="m8 3 4 4 4-4"/>
    </svg>`
  },
  {
    keywords: ['sew', 'stitch', 'thread', 'needle', 'knot', 'tie'],
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 12h20"/><path d="M12 2v20"/>
      <path d="m4.93 4.93 14.14 14.14"/><path d="m19.07 4.93-14.14 14.14"/>
    </svg>`
  },
  {
    keywords: ['plant', 'soil', 'seed', 'grow', 'garden'],
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/>
      <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8Z"/>
      <path d="M14.1 6a7 7 0 0 1 1.1 4.8 4 4 0 0 1-4 0V10a4 4 0 0 1 4-4Z"/>
    </svg>`
  },
  {
    keywords: ['heat', 'melt', 'burn', 'candle', 'fire', 'hot', 'iron'],
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5Z"/>
    </svg>`
  },
  {
    keywords: ['mix', 'stir', 'blend', 'combine', 'whisk'],
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2Z"/>
      <path d="M12 8v8"/><path d="M8 12h8"/>
    </svg>`
  },
  {
    keywords: ['connect', 'join', 'link', 'assemble', 'fasten'],
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>`
  },
  {
    // default: pencil / general step
    keywords: [],
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z"/>
    </svg>`
  }
];

function pickStepIcon(step: string): string {
  const lower = step.toLowerCase();
  for (const entry of STEP_ICONS) {
    if (entry.keywords.length === 0) continue;
    if (entry.keywords.some(kw => lower.includes(kw))) {
      return entry.svg;
    }
  }
  return STEP_ICONS[STEP_ICONS.length - 1].svg;
}
