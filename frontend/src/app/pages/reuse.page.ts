import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../api.service';
import { SessionStore } from '../session.store';
import { DiyGuide } from '../models';

@Component({
  selector: 'app-reuse-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './reuse.page.html',
  styleUrl: './reuse.page.css'
})
export class ReusePage {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(SessionStore);

  readonly difficulties = ['easy', 'medium', 'hard'] as const;
  readonly difficulty = signal<'easy' | 'medium' | 'hard'>('easy');
  readonly material = signal(this.store.scan()?.material || 'plastic');
  readonly guides = signal<DiyGuide[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');

  constructor() {
    const fromQuery = this.route.snapshot.queryParamMap.get('material');
    if (fromQuery) {
      this.material.set(fromQuery);
    }
    this.load();
  }

  onDifficulty(value: string) {
    if (value === 'easy' || value === 'medium' || value === 'hard') {
      this.difficulty.set(value);
      this.load();
    }
  }

  private load() {
    this.loading.set(true);
    this.api.diy(this.material(), this.difficulty()).subscribe({
      next: (guides) => {
        this.guides.set(guides);
        this.loading.set(false);
        this.error.set(guides.length ? '' : 'No DIY ideas for this mix yet.');
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Could not load DIY ideas. Is the Java API running?');
      }
    });
  }
}
