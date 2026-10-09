export interface Detection {
  className: string;
  score: number;
}

export interface CatalogItem {
  id: string;
  name: string;
  material: string;
  recyclable: boolean;
  bin: string;
  notes: string;
  waterLiters: number;
  co2Kg: number;
  materialGrams: number;
  materialLabel: string;
  rewardPoints: number;
}

export interface ScanResult {
  itemId: string;

  // AI identification
  name: string;
  brand: string;
  size: string;
  container: string;

  // Recycling information
  recyclable: boolean;
  bin: string;
  material: string;

  // Description from AI
  notes: string;

  // Existing impact/reward fields
  waterLiters: number;
  co2Kg: number;
  materialGrams: number;
  materialLabel: string;
  rewardPoints: number;

  // AI confidence
  matchedLabel: string;
  confidence: number;
}

export interface Stats {
  points: number;
  itemsRecycled: number;
  waterLiters: number;
  co2Kg: number;
  materialGrams: number;
  badges: string[];
  byMaterial: {
    material: string;
    count: number;
  }[];
}

export interface RecycleResult {
  quantity: number;
  itemName: string;
  waterLitersThisTurn: number;
  co2KgThisTurn: number;
  materialGramsThisTurn: number;
  materialLabel: string;
  pointsThisTurn: number;
  newBadges: string[];
  totals: Stats;
}

export interface DiyGuide {
  id: string;
  title: string;
  material: string;
  difficulty: string;
  summary: string;
  youtubeSearch: string;
  youtubeVideoId?: string;
  tools: string[];
  materials: string[];
  steps: string[];
}

export interface DiyGuide {
  id: string;
  title: string;
  material: string;
  difficulty: string;
  summary: string;
  youtubeSearch: string;
  youtubeVideoId?: string;
  tools: string[];
  materials: string[];
  steps: string[];
}

export interface ReuseIdea {

  title: string;

  difficulty: string;

  summary: string;

  finalProduct: string;

  materials: string[];

  tools: string[];

  steps: string[];

  tutorialTitle: string;

  tutorialUrl: string;

  sourceTitle: string;

  sourceUrl: string;
}

export interface ReuseResult {

  difficulty: string;

  ideas: ReuseIdea[];
}