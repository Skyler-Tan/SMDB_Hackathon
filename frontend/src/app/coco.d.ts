export {};

declare global {
  interface Window {
    cocoSsd: {
      load: () => Promise<{
        detect: (img: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement) => Promise<
          { class: string; score: number }[]
        >;
      }>;
    };
  }
}
