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

@Component({
  selector: 'app-scan',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './scan.page.html',
  styleUrl: './scan.page.css'
})
export class ScanPage implements AfterViewInit, OnDestroy {

  constructor(
    private readonly api: ApiService
  ) {}

  @ViewChild('video')
  video!: ElementRef<HTMLVideoElement>;

  @ViewChild('frame')
  frame!: ElementRef<HTMLCanvasElement>;

  private stream?: MediaStream;

  readonly busy =
    signal(false);

  readonly error =
    signal('');

  readonly status =
    signal('Point your camera at an item');

  readonly result =
    signal<ScanResult | null>(null);

  readonly quantity =
    signal(1);

  readonly recycleResult =
    signal<any | null>(null);

  readonly recyclingLoading =
    signal(false);

  readonly reuseResult =
    signal<ReuseResult | null>(null);

  readonly reuseDifficulty =
    signal('Easy');

  readonly selectedReuse =
    signal<ReuseIdea | null>(null);

  private readonly reuseCache:
    Record<string, ReuseResult | null> = {
      Easy: null,
      Medium: null,
      Hard: null
    };

  readonly reuseLoading =
    signal<Record<string, boolean>>({
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

      this.stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: {
              ideal: 'environment'
            }
          },
          audio: false
        });

      this.video.nativeElement.srcObject =
        this.stream;

      await this.video.nativeElement.play();

      this.status.set(
        'Point your camera at an item'
      );

    } catch (err) {

      console.error(err);

      this.status.set(
        'Camera unavailable'
      );

      this.error.set(
        'Camera permission was denied or the camera is unavailable. You can upload a photo instead.'
      );
    }
  }

  stopCamera() {

    if (this.stream) {

      this.stream
        .getTracks()
        .forEach(track =>
          track.stop()
        );

      this.stream = undefined;
    }
  }

  capture() {

    if (this.busy()) {
      return;
    }

    const video =
      this.video.nativeElement;

    const canvas =
      this.frame.nativeElement;

    if (
      !video.videoWidth ||
      !video.videoHeight
    ) {

      this.error.set(
        'Camera is not ready yet.'
      );

      return;
    }

    canvas.width =
      video.videoWidth;

    canvas.height =
      video.videoHeight;

    const context =
      canvas.getContext('2d');

    if (!context) {

      this.error.set(
        'Could not capture the image.'
      );

      return;
    }

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const image =
      canvas.toDataURL(
        'image/jpeg',
        0.85
      );

    this.sendImage(image);
  }

  onUpload(event: Event) {

    const input =
      event.target as HTMLInputElement;

    if (
      !input.files ||
      input.files.length === 0
    ) {
      return;
    }

    const file =
      input.files[0];

    if (
      !file.type.startsWith('image/')
    ) {

      this.error.set(
        'Please select an image file.'
      );

      return;
    }

    const reader =
      new FileReader();

    reader.onload = () => {

      const image =
        reader.result;

      if (
        typeof image !== 'string'
      ) {

        this.error.set(
          'Could not read the image.'
        );

        return;
      }

      this.sendImage(image);
    };

    reader.onerror = () => {

      this.error.set(
        'Could not read the image.'
      );
    };

    reader.readAsDataURL(file);
  }

  private sendImage(image: string) {

    this.busy.set(true);

    this.error.set('');

    this.result.set(null);

    this.recycleResult.set(null);

    this.recyclingLoading.set(false);

    this.reuseResult.set(null);

    this.selectedReuse.set(null);

    this.quantity.set(1);

    this.reuseDifficulty.set('Easy');

    this.clearReuseCache();

    this.status.set(
      'AI is identifying the item...'
    );

    this.api.scan(image).subscribe({

      next: (response: ScanResult) => {

        console.log(
          'AI scan result:',
          response
        );

        this.result.set(
          response
        );

        this.status.set(
          'Checking recycling information...'
        );

        this.busy.set(false);

        this.recyclingLoading.set(true);

        this.startRecyclingCheck(
          response.itemId
        );

        this.preloadReuseIdeas(
          response
        );
      },

      error: (err: any) => {

        console.error(
          'Scan error:',
          err
        );

        this.error.set(
          err?.error?.message ||
          'The AI scan failed. Please try again.'
        );

        this.status.set(
          'Scan failed'
        );

        this.busy.set(false);

        this.recyclingLoading.set(false);
      }
    });
  }

  private startRecyclingCheck(
    itemId: string
  ) {

    this.api.recycling(
      itemId
    ).subscribe({

      next: (response: ScanResult) => {

        if (
          this.result()?.itemId !==
          itemId
        ) {
          return;
        }

        console.log(
          'Background recycling result:',
          response
        );

        this.result.set(
          response
        );

        this.recyclingLoading.set(false);

        this.status.set(
          'Scan complete'
        );
      },

      error: (err: any) => {

        if (
          this.result()?.itemId !==
          itemId
        ) {
          return;
        }

        console.error(
          'Background recycling error:',
          err
        );

        this.recyclingLoading.set(false);

        this.status.set(
          'Scan complete'
        );
      }
    });
  }

  private preloadReuseIdeas(
    scan: ScanResult
  ) {

    this.setReuseLoading(
      'Easy',
      true
    );

    this.setReuseLoading(
      'Medium',
      true
    );

    this.setReuseLoading(
      'Hard',
      true
    );

    this.generateReuse(
      scan,
      'Easy'
    );

    this.generateReuse(
      scan,
      'Medium'
    );

    this.generateReuse(
      scan,
      'Hard'
    );
  }

  private generateReuse(
    scan: ScanResult,
    difficulty: string
  ) {

    this.api.reuse(
      scan.name,
      scan.brand,
      scan.size,
      scan.container,
      scan.material,
      difficulty
    ).subscribe({

      next: (response: ReuseResult) => {

        if (
          this.result()?.itemId !==
          scan.itemId
        ) {
          return;
        }

        console.log(
          `${difficulty} reuse ready:`,
          response
        );

        this.reuseCache[
          difficulty
        ] = response;

        this.setReuseLoading(
          difficulty,
          false
        );

        if (
          this.reuseDifficulty() ===
          difficulty
        ) {

          this.reuseResult.set(
            response
          );
        }
      },

      error: (err: any) => {

        console.error(
          `${difficulty} reuse error:`,
          err
        );

        this.setReuseLoading(
          difficulty,
          false
        );
      }
    });
  }

  private setReuseLoading(
    difficulty: string,
    loading: boolean
  ) {

    this.reuseLoading.update(
      current => ({
        ...current,
        [difficulty]: loading
      })
    );
  }

  private clearReuseCache() {

    this.reuseCache['Easy'] =
      null;

    this.reuseCache['Medium'] =
      null;

    this.reuseCache['Hard'] =
      null;

    this.reuseLoading.set({
      Easy: false,
      Medium: false,
      Hard: false
    });
  }

  changeQty(amount: number) {

    const next =
      this.quantity() + amount;

    if (next < 1) {
      return;
    }

    this.quantity.set(next);
  }

  recycle() {

    const scan =
      this.result();

    if (
      !scan ||
      !scan.recyclable ||
      !scan.itemId ||
      this.recyclingLoading()
    ) {
      return;
    }

    this.busy.set(true);

    this.api.recycle(
      scan.itemId,
      this.quantity()
    ).subscribe({

      next: (response: any) => {

        this.recycleResult.set(
          response
        );

        this.busy.set(false);
      },

      error: (err: any) => {

        console.error(
          'Recycle error:',
          err
        );

        this.error.set(
          err?.error?.message ||
          'Could not recycle this item.'
        );

        this.busy.set(false);
      }
    });
  }

  reuse() {

    const scan =
      this.result();

    if (!scan) {
      return;
    }

    this.reuseDifficulty.set(
      'Easy'
    );

    this.selectedReuse.set(
      null
    );

    const cached =
      this.reuseCache['Easy'];

    if (cached) {

      this.reuseResult.set(
        cached
      );

      this.status.set(
        'Easy reuse ideas ready'
      );

    } else {

      this.reuseResult.set(
        null
      );

      this.status.set(
        'Easy reuse ideas are still generating...'
      );
    }
  }

  changeReuseDifficulty(
    difficulty: string
  ) {

    if (
      difficulty !== 'Easy' &&
      difficulty !== 'Medium' &&
      difficulty !== 'Hard'
    ) {
      return;
    }

    this.reuseDifficulty.set(
      difficulty
    );

    this.selectedReuse.set(
      null
    );

    const cached =
      this.reuseCache[
        difficulty
      ];

    if (cached) {

      this.reuseResult.set(
        cached
      );

      this.status.set(
        `${difficulty} reuse ideas ready`
      );

    } else {

      this.reuseResult.set(
        null
      );

      this.status.set(
        `${difficulty} reuse ideas are still generating...`
      );
    }
  }

  openReuseIdea(
    idea: ReuseIdea
  ) {

    this.selectedReuse.set(
      idea
    );
  }

  closeReuseIdea() {

    this.selectedReuse.set(
      null
    );
  }

  closeReuse() {

    this.reuseResult.set(
      null
    );

    this.selectedReuse.set(
      null
    );

    this.status.set(
      'Scan complete'
    );
  }

  closeResult() {

    this.result.set(null);

    this.recycleResult.set(null);

    this.recyclingLoading.set(false);

    this.reuseResult.set(null);

    this.selectedReuse.set(null);

    this.clearReuseCache();

    this.quantity.set(1);

    this.error.set('');

    this.status.set(
      'Point your camera at an item'
    );
  }
}