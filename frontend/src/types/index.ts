export type MetricKey = "smoothness" | "hydration" | "pinkness" | "overallAppearance";

export interface Metrics {
  smoothness: number;
  hydration: number;
  pinkness: number;
  overallAppearance: number;
}

export interface MetricHighlight {
  key: MetricKey;
  label: string;
  value: number;
}

export interface WeaknessHighlight extends MetricHighlight {
  summary: string;
}

export interface AnalysisResult {
  id: string;
  score: number;
  metrics: Metrics;
  strength: MetricHighlight;
  weakness: WeaknessHighlight;
  recommendedGuideSlug: string;
  createdAt: string;
}

export interface LowQualityError {
  error: "low_quality";
  message: string;
}

export interface RatingSubmitResponse {
  publicId: string;
  status: "published";
}

export interface RatingFeedPhoto {
  publicId: string;
  imageUrl: string;
  voteCount: number;
  averageScore: number | null;
}

export interface RatingFeedResponse {
  photos: RatingFeedPhoto[];
}

export interface RatingTopResponse {
  photos: RatingFeedPhoto[];
}

export interface RatingVoteResponse {
  recorded: true;
}

export interface GuideSummary {
  slug: string;
  title: string;
  shortDescription: string;
  isPremium: boolean;
}

export interface GuideSection {
  heading: string;
  body: string;
}

export interface GuideDetail {
  slug: string;
  title: string;
  isPremium: boolean;
  sections: GuideSection[];
}

export interface Profile {
  score: number;
  scoreHistory: number[];
  publicRating: number | null;
  publicVotesCount: number;
}
