export type MetricKey = "smoothness" | "hydration" | "pinkness" | "overallAppearance";

export interface FootMetrics {
  smoothness: number;
  hydration: number;
  pinkness: number;
  overallAppearance: number;
}

export type QualityIssue = "too_dark" | "too_blurry" | "feet_not_visible" | "too_small" | null;

export interface GeminiAnalysisResult extends FootMetrics {
  confidence: "low" | "medium" | "high";
  qualityOk: boolean;
  qualityIssue: QualityIssue;
  explanation: string;
}

export interface GuideSection {
  heading: string;
  body: string;
}

export interface Guide {
  slug: string;
  title: string;
  shortDescription: string;
  isPremium: boolean;
  sections: GuideSection[];
}

export interface ResolvedUser {
  id: string;
  telegramId: string;
}
