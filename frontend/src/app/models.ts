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
  name: string;
  brand: string;
  size: string;
  container: string;

  identificationConfirmed: boolean;
  identificationMessage: string;
  recyclingStatus: string;

  recyclable: boolean;
  bin: string;
  material: string;
  notes: string;

  waterLiters: number;
  co2Kg: number;
  materialGrams: number;
  materialLabel: string;
  rewardPoints: number;

  matchedLabel: string;
  confidence: number;

  // Condition score
  conditionScore: number;
  conditionLabel: string;
  conditionTips: string[];
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

export interface NearbyPlace {
  name: string;
  address: string;
  lat: number;
  lng: number;
  openNow: string;   // 'Open now' | 'Closed' | 'Unknown'
  rating: number;    // 0 if not available
  mapsUrl: string;   // deep-link to Google Maps
  distanceMeters?: number;
  osmType?: string;
  osmId?: string;
}