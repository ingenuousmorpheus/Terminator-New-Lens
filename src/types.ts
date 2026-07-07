export interface AnalysisData {
  AGE: string;
  WEIGHT: string;
  HEIGHT: string;
  RACE: string;
  MOOD: string;
  HAIR_COLOR: string;
  SHIRT_COLOR: string;
}

// coco-ssd specific type
export interface DetectedObject {
  bbox: [number, number, number, number];
  class: string;
  score: number;
}

export type VisionProvider = 'gemini' | 'lmstudio';

export interface LMStudioConfig {
  endpoint: string;
  model: string;
}
