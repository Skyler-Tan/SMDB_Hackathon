import { Injectable, signal } from '@angular/core';
import { RecycleResult, ScanResult } from './models';

@Injectable({ providedIn: 'root' })
export class SessionStore {
  readonly scan = signal<ScanResult | null>(null);
  readonly photo = signal<string | null>(null);
  readonly lastRecycle = signal<RecycleResult | null>(null);

  setScan(result: ScanResult, photo: string | null) {
    this.scan.set(result);
    this.photo.set(photo);
  }

  clearScan() {
    this.scan.set(null);
    this.photo.set(null);
  }
}
