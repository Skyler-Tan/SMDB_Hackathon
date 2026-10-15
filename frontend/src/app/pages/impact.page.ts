import { Component, inject, signal } from '@angular/core';
import { ApiService } from '../api.service';
import { SessionStore } from '../session.store';
import { RecycleResult, Stats } from '../models';

@Component({
  selector: 'app-impact-page',
  templateUrl: './impact.page.html',
  styleUrl: './impact.page.css'
})
export class ImpactPage {
  private readonly api = inject(ApiService);
  readonly store = inject(SessionStore);
  readonly stats = signal<Stats | null>(null);
  readonly error = signal('');

  constructor() {
    this.api.stats().subscribe({
      next: (stats) => this.stats.set(stats),
      error: () => this.error.set('Could not load rewards. Start MongoDB and the Java API.')
    });
  }

  last(): RecycleResult | null {
    return this.store.lastRecycle();
  }
}
