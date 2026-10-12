
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ApiService } from '../api.service';

import {
  ReuseIdea,
  ReuseResult,
  NearbyPlace,
  ScanResult
} from '../models';

type Difficulty = 'Easy' | 'Medium' | 'Hard';
type ConfidenceLevel = 'high' | 'medium' | 'low';

@Component({
  selector: 'app-scan',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './scan.page.html',
  styleUrl: './scan.page.css'
})
export class ScanPage implements AfterViewInit, OnDestroy {

  constructor(
    private readonly api: ApiService,
    private readonly sanitizer: DomSanitizer
  ) {}

  @ViewChild('video')
  video!: ElementRef<HTMLVideoElement>;

  @ViewChild('frame')
  frame!: ElementRef<HTMLCanvasElement>;

  private stream?: MediaStream;

  readonly busy = signal(false);
  readonly error = signal('');
  readonly status = signal('Point your camera at an item');

  readonly result = signal<ScanResult | null>(null);
  readonly quantity = signal(1);

  readonly identificationLevel =
    signal<ConfidenceLevel | null>(null);

  readonly identificationConfirmed = signal(false);
  readonly correctionMode = signal(false);
  readonly correctedName = signal('');
  readonly correctionLoading = signal(false);

  readonly recycleResult = signal<any | null>(null);
  readonly recyclingLoading = signal(false);

  readonly reuseMode = signal(false);
  readonly reuseResult = signal<ReuseResult | null>(null);
  readonly reuseDifficulty = signal<Difficulty>('Easy');
  readonly selectedReuse = signal<ReuseIdea | null>(null);

  private readonly reuseCache: Record<Difficulty, ReuseResult | null> = {
    Easy: null,
    Medium: null,
    Hard: null
  };

  readonly reuseLoading = signal<Record<Difficulty, boolean>>({
    Easy: false,
    Medium: false,
    Hard: false
  });

  // ── Nearby recycling centres ──────────────────────────────
  readonly nearbyPlaces = signal<NearbyPlace[]>([]);
  readonly nearbyLoading = signal(false);
  readonly nearbyError = signal('');

  async ngAfterViewInit() {
    await this.startCamera();
  }

  ngOnDestroy() {
    this.stopCamera();
  }

  async startCamera() {
    try {
      this.error.set('');
      this.status.set('Starting camera...');

      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }
        },
        audio: false
      });

      this.video.nativeElement.srcObject = this.stream;
      await this.video.nativeElement.play();

      this.status.set('Point your camera at an item');
    } catch (err) {
      console.error('Camera error:', err);

      this.status.set('Camera unavailable');
      this.error.set(
        'Camera permission was denied or the camera is unavailable. You can upload a photo instead.'
      );
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = undefined;
    }
  }

  capture() {
    if (this.busy()) return;

    const video = this.video.nativeElement;
    const canvas = this.frame.nativeElement;

    if (!video.videoWidth || !video.videoHeight) {
      this.error.set('Camera is not ready yet.');
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');

    if (!context) {
      this.error.set('Could not capture the image.');
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    this.sendImage(canvas.toDataURL('image/jpeg', 0.85));
  }

  onUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.error.set('Please select an image file.');
      input.value = '';
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        this.error.set('Could not read the image.');
        input.value = '';
        return;
      }

      this.sendImage(reader.result);
      input.value = '';
    };

    reader.onerror = () => {
      this.error.set('Could not read the image.');
      input.value = '';
    };

    reader.readAsDataURL(file);
  }

  /**
   * Supports confidence values expressed either as 0–1
   * or as percentages from 0–100.
   */
  confidencePercent(confidence: number): number {
    const value = Number(confidence);

    if (!Number.isFinite(value)) return 0;

    const normalized = value > 1 ? value : value * 100;

    return Math.max(0, Math.min(100, normalized));
  }

  private getConfidenceLevel(
    confidence: number
  ): ConfidenceLevel {
    const percentage = this.confidencePercent(confidence);

    if (percentage >= 80) return 'high';
    if (percentage >= 60) return 'medium';

    return 'low';
  }

  private resetIdentification() {
    this.identificationLevel.set(null);
    this.identificationConfirmed.set(false);
    this.correctionMode.set(false);
    this.correctedName.set('');
    this.correctionLoading.set(false);
  }

  private sendImage(image: string) {
    this.busy.set(true);
    this.error.set('');

    this.result.set(null);
    this.recycleResult.set(null);
    this.recyclingLoading.set(false);

    this.resetIdentification();

    this.reuseMode.set(false);
    this.reuseResult.set(null);
    this.selectedReuse.set(null);
    this.reuseDifficulty.set('Easy');

    this.quantity.set(1);
    this.clearReuseCache();

    this.status.set('AI is identifying the item...');

    this.api.scan(image).subscribe({
      next: (response: ScanResult) => {
        console.log('AI scan result:', response);

        this.result.set(response);
        this.busy.set(false);

        const level = this.getConfidenceLevel(
          response.confidence
        );

        this.identificationLevel.set(level);

        // The backend decides whether this item is already confirmed.
        const confirmed = response.identificationConfirmed === true;

        this.identificationConfirmed.set(confirmed);

        if (confirmed) {
          this.status.set('Item identified successfully.');
          this.continueAfterIdentification(response);
        } else {
          this.status.set(
            level === 'medium'
              ? 'Please confirm the identified item.'
              : 'Identification is uncertain. Please check the item.'
          );
        }
      },

      error: (err: any) => {
        console.error('Scan error:', err);

        this.error.set(
          err?.error?.message ||
          'The AI scan failed. Please try again.'
        );

        this.status.set('Scan failed');
        this.busy.set(false);
        this.recyclingLoading.set(false);
      }
    });
  }

  /**
   * Called when the user presses Yes.
   * Persist confirmation before starting recycling or DIY requests.
   */
  confirmIdentification() {
    const scan = this.result();

    if (!scan || this.busy()) return;

    if (!scan.itemId) {
      this.error.set(
        'This scan has no saved item ID. Please scan the item again.'
      );
      return;
    }

    this.busy.set(true);
    this.error.set('');
    this.correctionMode.set(false);
    this.status.set('Saving your confirmation...');

    this.api.confirmIdentification(scan.itemId).subscribe({
      next: (response: ScanResult) => {
        if (this.result()?.itemId !== scan.itemId) return;

        const confirmedScan: ScanResult = {
          ...scan,
          ...response,
          identificationConfirmed: true
        };

        this.result.set(confirmedScan);
        this.identificationConfirmed.set(true);
        this.busy.set(false);

        this.status.set('Confirmation saved. Preparing results...');
        this.continueAfterIdentification(confirmedScan);
      },

      error: (err: any) => {
        console.error('Confirmation error:', err);

        this.busy.set(false);
        this.identificationConfirmed.set(false);

        this.error.set(
          err?.error?.message ||
          'Could not confirm the item. Please try again.'
        );

        this.status.set('Confirmation failed');
      }
    });
  }

  /**
   * Called when the user presses No.
   */
  rejectIdentification() {
    if (this.busy()) return;

    this.error.set('');
    this.correctedName.set('');
    this.correctionMode.set(true);

    this.status.set('Enter the correct item name.');
  }

  /**
   * Save the corrected name and backend confirmation first.
   */
  submitCorrection() {
    const scan = this.result();
    const name = this.correctedName().trim();

    if (!scan) return;

    if (!name) {
      this.error.set('Please enter the correct item name.');
      return;
    }

    if (name.length > 150) {
      this.error.set(
        'The item name must be 150 characters or fewer.'
      );
      return;
    }

    if (!scan.itemId) {
      this.error.set(
        'This scan has no saved item ID. Please scan the item again.'
      );
      return;
    }

    this.correctionLoading.set(true);
    this.error.set('');
    this.status.set('Saving your correction...');

    this.api.correctItemName(scan.itemId, name).subscribe({
      next: response => {
        const correctedScan: ScanResult = {
          ...scan,
          name: response.name,
          identificationConfirmed:
            response.identificationConfirmed ?? true,
          recyclingStatus: 'UNVERIFIED',
          recyclable: false,
          bin: 'unknown'
        };

        this.result.set(correctedScan);
        this.correctedName.set(response.name);
        this.correctionMode.set(false);
        this.correctionLoading.set(false);
        this.identificationConfirmed.set(true);

        // The backend has saved the correction and confirmed the item.
        // Now perform a fresh recycling check and generate DIY ideas.
        this.status.set('Correction saved. Preparing results...');
        this.continueAfterIdentification(correctedScan);
      },

      error: err => {
        console.error('Correction error:', err);

        this.correctionLoading.set(false);
        this.error.set(
          err?.error?.message ||
          'Could not save the corrected item name. Please try again.'
        );

        this.status.set('Correction failed');
      }
    });
  }

  /**
   * Only start these tasks after confirmation is persisted.
   */
  private continueAfterIdentification(scan: ScanResult) {
    if (!this.identificationConfirmed()) return;

    this.status.set('Preparing your results...');

    if (scan.itemId) {
      this.recyclingLoading.set(true);
      this.startRecyclingCheck(scan.itemId);
    } else {
      this.status.set('Identification complete');
    }

    this.preloadReuseIdeas(scan);
  }

  private startRecyclingCheck(itemId: string) {
    this.api.recycling(itemId).subscribe({
      next: (response: ScanResult) => {
        if (this.result()?.itemId !== itemId) return;

        console.log('Recycling result:', response);

        this.result.set(response);
        this.recyclingLoading.set(false);
        this.status.set('Scan complete');
      },

      error: (err: any) => {
        if (this.result()?.itemId !== itemId) return;

        console.error('Recycling check error:', err);

        this.recyclingLoading.set(false);
        this.status.set('Scan complete');

        this.error.set(
          err?.error?.message ||
          'The item was identified, but recycling information could not be checked.'
        );
      }
    });
  }

  private preloadReuseIdeas(scan: ScanResult) {
    this.generateReuse(scan, 'Easy');
  }

  private generateReuse(scan: ScanResult, difficulty: Difficulty) {
    if (!this.identificationConfirmed()) return;

    if (!scan.itemId) {
      this.error.set(
        'This item has no saved ID. Please scan it again.'
      );
      return;
    }

    const cached = this.reuseCache[difficulty];

    if (cached) {
      if (
        this.result()?.itemId === scan.itemId &&
        this.reuseMode() &&
        this.reuseDifficulty() === difficulty
      ) {
        this.reuseResult.set(cached);
        this.status.set(`${difficulty} reuse ideas ready`);
      }

      return;
    }

    if (this.reuseLoading()[difficulty]) return;

    this.setReuseLoading(difficulty, true);

    if (
      this.reuseMode() &&
      this.reuseDifficulty() === difficulty
    ) {
      this.reuseResult.set(null);
      this.status.set(
        `Generating ${difficulty.toLowerCase()} reuse ideas...`
      );
    }

    // IMPORTANT: include itemId so the backend can load the saved,
    // confirmed item rather than relying only on frontend data.
    this.api.reuse(
      scan.itemId,
      scan.name,
      scan.brand,
      scan.size,
      scan.container,
      scan.material,
      difficulty
    ).subscribe({
      next: (response: ReuseResult) => {
        this.reuseCache[difficulty] = response;
        this.setReuseLoading(difficulty, false);

        if (
          this.result()?.itemId === scan.itemId &&
          this.reuseMode() &&
          this.reuseDifficulty() === difficulty
        ) {
          this.reuseResult.set(response);
          this.status.set(`${difficulty} reuse ideas ready`);
        }

        console.log(`${difficulty} reuse ideas ready:`, response);
      },

      error: (err: any) => {
        console.error(`${difficulty} reuse error:`, err);

        this.setReuseLoading(difficulty, false);

        if (
          this.result()?.itemId === scan.itemId &&
          this.reuseMode() &&
          this.reuseDifficulty() === difficulty
        ) {
          this.error.set(
            err?.error?.message ||
            'Could not generate reuse ideas. Please try again.'
          );

          this.status.set('Reuse generation failed');
        }
      }
    });
  }

  private setReuseLoading(
    difficulty: Difficulty,
    loading: boolean
  ) {
    this.reuseLoading.update(current => ({
      ...current,
      [difficulty]: loading
    }));
  }

  private clearReuseCache() {
    this.reuseCache.Easy = null;
    this.reuseCache.Medium = null;
    this.reuseCache.Hard = null;

    this.reuseLoading.set({
      Easy: false,
      Medium: false,
      Hard: false
    });
  }

  changeQty(amount: number) {
    const next = this.quantity() + amount;

    if (next >= 1) {
      this.quantity.set(next);
    }
  }

  recycle() {
    const scan = this.result();

    if (
      !this.identificationConfirmed() ||
      !scan ||
      !scan.recyclable ||
      scan.recyclingStatus !== 'RECYCLABLE' ||
      !scan.itemId ||
      this.recyclingLoading() ||
      this.busy()
    ) {
      return;
    }

    this.busy.set(true);
    this.error.set('');

    this.api.recycle(scan.itemId, this.quantity()).subscribe({
      next: (response: any) => {
        this.recycleResult.set(response);
        this.busy.set(false);
        // Auto-fetch nearby centres after a successful recycle
        this.getNearby(scan.material);
      },

      error: (err: any) => {
        console.error('Recycle error:', err);

        this.error.set(
          err?.error?.message ||
          'Could not recycle this item.'
        );

        this.busy.set(false);
      }
    });
  }

  /**
   * Asks the browser for the user's location, then calls the backend
   * to find recycling centres nearby. Triggered automatically after
   * a successful recycle event.
   */
  getNearby(material: string) {
    this.nearbyPlaces.set([]);
    this.nearbyError.set('');
    this.nearbyLoading.set(true);

    if (!navigator.geolocation) {
      this.nearbyError.set('Your browser does not support location access.');
      this.nearbyLoading.set(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        this.api.nearbyRecycling(lat, lng, material).subscribe({
          next: (places) => {
            this.nearbyPlaces.set(places);
            this.nearbyLoading.set(false);

            if (places.length === 0) {
              this.nearbyError.set(
                'No recycling centres found within 5 km.'
              );
            }
          },
          error: (err: any) => {
            this.nearbyLoading.set(false);
            this.nearbyError.set(
              err?.error?.error ||
              err?.error?.message ||
              'Could not fetch nearby centres. Please try again.'
            );
          }
        });
      },
      (err) => {
        this.nearbyLoading.set(false);

        if (err.code === err.PERMISSION_DENIED) {
          this.nearbyError.set(
            'Location access was denied. Enable it in your browser to find nearby centres.'
          );
        } else {
          this.nearbyError.set(
            'Could not determine your location.'
          );
        }
      },
      { timeout: 10_000, maximumAge: 60_000 }
    );
  }

  reuse() {
    const scan = this.result();

    if (!scan || !this.identificationConfirmed()) return;

    this.error.set('');
    this.reuseMode.set(true);
    this.reuseDifficulty.set('Easy');
    this.selectedReuse.set(null);

    const cached = this.reuseCache.Easy;

    if (cached) {
      this.reuseResult.set(cached);
      this.status.set('Easy reuse ideas ready');
    } else {
      this.reuseResult.set(null);

      if (this.reuseLoading().Easy) {
        this.status.set('Finishing your Easy reuse ideas...');
      } else {
        this.status.set('Generating Easy reuse ideas...');
        this.generateReuse(scan, 'Easy');
      }
    }
  }

  changeReuseDifficulty(value: string) {
    if (
      value !== 'Easy' &&
      value !== 'Medium' &&
      value !== 'Hard'
    ) {
      return;
    }

    const difficulty = value as Difficulty;
    const scan = this.result();

    if (!scan || !this.identificationConfirmed()) return;

    this.error.set('');
    this.reuseDifficulty.set(difficulty);
    this.selectedReuse.set(null);
    this.reuseResult.set(null);

    const cached = this.reuseCache[difficulty];

    if (cached) {
      this.reuseResult.set(cached);
      this.status.set(`${difficulty} reuse ideas ready`);
      return;
    }

    if (this.reuseLoading()[difficulty]) {
      this.status.set(
        `Finishing your ${difficulty.toLowerCase()} reuse ideas...`
      );
      return;
    }

    this.status.set(
      `Generating ${difficulty.toLowerCase()} reuse ideas...`
    );

    this.generateReuse(scan, difficulty);
  }

  openReuseIdea(idea: ReuseIdea) {
    this.selectedReuse.set(idea);
  }

  closeReuseIdea() {
    this.selectedReuse.set(null);
  }

  closeReuse() {
    this.reuseMode.set(false);
    this.reuseResult.set(null);
    this.selectedReuse.set(null);
    this.error.set('');
    this.status.set('Scan complete');
  }

  closeResult() {
    this.result.set(null);
    this.recycleResult.set(null);
    this.recyclingLoading.set(false);

    this.resetIdentification();

    this.reuseMode.set(false);
    this.reuseResult.set(null);
    this.selectedReuse.set(null);

    this.clearReuseCache();

    this.nearbyPlaces.set([]);
    this.nearbyLoading.set(false);
    this.nearbyError.set('');

    this.quantity.set(1);
    this.error.set('');
    this.status.set('Point your camera at an item');
  }

  /** Returns a context-aware SVG icon for a reuse step based on its text. */
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
    // default: pencil / write / general step
    keywords: [],
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z"/>
    </svg>`
  }
];

function pickStepIcon(step: string): string {
  const lower = step.toLowerCase();
  for (const entry of STEP_ICONS) {
    if (entry.keywords.length === 0) continue; // skip the default
    if (entry.keywords.some(kw => lower.includes(kw))) {
      return entry.svg;
    }
  }
  // return default
  return STEP_ICONS[STEP_ICONS.length - 1].svg;
}
