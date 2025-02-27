export interface WeddingPlan {
  venue: string;
  decor: string;
  timeline: string;
  vendors: string;
  budget: string;
  recommendations: string;
}

export interface PlanFormData {
  budget: string;
  guestCount: number;
  location: string;
  preferences: string;
  dateRange: string;
  style?: string;
  season?: string;
}
