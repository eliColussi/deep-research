// /utils/ai/types.ts
// Common types used across the AI utilities

/**
 * Progress information for research operations
 */
export interface ResearchProgress {
  totalQueries: number;
  completedQueries: number;
  currentQuery?: string;
}
