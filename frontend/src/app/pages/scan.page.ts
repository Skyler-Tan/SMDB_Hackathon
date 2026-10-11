
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { ApiService } from '../api.service';

import {
  ReuseIdea,
  ReuseResult,
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

  constructor(private readonly api: ApiService) {}

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

    this.quantity.set(1);
    this.error.set('');
    this.status.set('Point your camera at an item');
  }
}
