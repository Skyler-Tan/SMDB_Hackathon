
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../api.service';

import {
  ReuseIdea,
  ReuseResult,
  ScanResult
} from '../models';

type Difficulty = 'Easy' | 'Medium' | 'Hard';

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
    private readonly router: Router
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

    const image = canvas.toDataURL('image/jpeg', 0.85);
    this.sendImage(image);
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

  private sendImage(image: string) {
    this.busy.set(true);
    this.error.set('');

    this.result.set(null);
    this.recycleResult.set(null);
    this.recyclingLoading.set(false);

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

        // Start both background tasks after identification.
        // The user does not need to open Reuse first.
        this.status.set('Preparing your results...');

        if (response.itemId) {
          this.recyclingLoading.set(true);
          this.startRecyclingCheck(response.itemId);
        } else {
          this.status.set('Scan complete');
        }

        // Preload Easy DIY ideas only.
        // Medium and Hard are generated when selected.
        this.preloadReuseIdeas(response);
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
      }
    });
  }

  private preloadReuseIdeas(scan: ScanResult) {
    // Automatically generate Easy ideas in the background.
    this.generateReuse(scan, 'Easy');
  }

  private generateReuse(scan: ScanResult, difficulty: Difficulty) {
    // Use cached ideas if this difficulty has already been generated.
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

    // Do not send a duplicate request while generation is in progress.
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

    this.api.reuse(
      scan.name,
      scan.brand,
      scan.size,
      scan.container,
      scan.material,
      difficulty
    ).subscribe({
      next: (response: ReuseResult) => {
        // Cache the result for quick access when Reuse is opened.
        this.reuseCache[difficulty] = response;
        this.setReuseLoading(difficulty, false);

        // Update the visible screen only for the current item
        // and currently selected difficulty.
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

  findRecyclingCentres() {
    const scan = this.result();
    if (!scan) return;

    // Open the map filtered to the material detected by the scan.
    // Recording the recycling action is left for the user to confirm on the map.
    void this.router.navigate(['/map'], {
      queryParams: {
        material: scan.material || '',
        itemName: scan.name || '',
        itemId: scan.itemId || '',
        quantity: this.quantity()
      }
    });
  }

  recycle() {
    const scan = this.result();

    if (
      !scan ||
      !scan.recyclable ||
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

    if (!scan) return;

    this.error.set('');
    this.reuseMode.set(true);
    this.reuseDifficulty.set('Easy');
    this.selectedReuse.set(null);

    const cached = this.reuseCache.Easy;

    if (cached) {
      // Open instantly if background generation has finished.
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

    if (!scan) return;

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

    this.reuseMode.set(false);
    this.reuseResult.set(null);
    this.selectedReuse.set(null);

    this.clearReuseCache();

    this.quantity.set(1);
    this.error.set('');
    this.status.set('Point your camera at an item');
  }
}