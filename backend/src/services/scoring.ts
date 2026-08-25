import type { FootMetrics } from "../types";

// Weights for the final Foot Score, tunable in one place.
export const SCORE_WEIGHT_SMOOTHNESS = 0.3;
export const SCORE_WEIGHT_HYDRATION = 0.3;
export const SCORE_WEIGHT_PINKNESS = 0.2;
export const SCORE_WEIGHT_OVERALL_APPEARANCE = 0.2;

export function computeFootScore(metrics: FootMetrics): number {
  const raw =
    metrics.smoothness * SCORE_WEIGHT_SMOOTHNESS +
    metrics.hydration * SCORE_WEIGHT_HYDRATION +
    metrics.pinkness * SCORE_WEIGHT_PINKNESS +
    metrics.overallAppearance * SCORE_WEIGHT_OVERALL_APPEARANCE;

  return Math.round(raw);
}
