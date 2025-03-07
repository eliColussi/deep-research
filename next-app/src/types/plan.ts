export interface WeddingPlan {
  id: string;
  venue: string;
  decor: string;
  timeline: string;
  vendors: string;
  budget: string;
  recommendations: string;
  initial_preferences?: PlanFormData;
  user_id: string;
  markdownPlan?: string; // Full markdown plan content
}

export interface PlanFormData {
  budget: string;
  guestCount: number;
  location: string;
  preferences: string;
  dateRange: string;
  season?: string;
  weddingStyle?: string;
  colorPalette?: string;
}

