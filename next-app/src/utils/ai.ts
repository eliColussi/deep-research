import { deepResearch } from './deep-research';
import type { WeddingPlan, PlanFormData } from '@/types/plan';

export async function generateWeddingPlan(preferences: PlanFormData): Promise<WeddingPlan> {
  // Convert preferences to a research query
  const query = `Generate a wedding plan with the following preferences:
    - Budget: ${preferences.budget}
    - Guest Count: ${preferences.guestCount}
    - Location: ${preferences.location}
    - Date Range: ${preferences.dateRange}
    - Style: ${preferences.style || 'Not specified'}
    - Season: ${preferences.season || (preferences.dateRange ? getSeasonFromDate(preferences.dateRange) : 'Not specified')}
    - Additional Preferences: ${preferences.preferences}
    Focus on venue suggestions, decor ideas, timeline planning, and vendor recommendations.`;

  function getSeasonFromDate(dateRange: string): string {
    try {
      const date = new Date(dateRange.split(' - ')[0]);
      const month = date.getMonth();
      if (month >= 2 && month <= 4) return 'Spring';
      if (month >= 5 && month <= 7) return 'Summer';
      if (month >= 8 && month <= 10) return 'Fall';
      return 'Winter';
    } catch {
      return 'Not specified';
    }
  }

  try {
    // Perform deep research
    const { learnings } = await deepResearch({
      query,
      breadth: 3, // Number of parallel searches
      depth: 2,   // How deep to go with follow-up questions
      onProgress: (progress) => {
        console.log('Research Progress:', progress);
      }
    });

    // Convert research learnings into a structured wedding plan
    const plan: WeddingPlan = {
      venue: extractVenueSuggestions(learnings),
      decor: extractDecorIdeas(learnings),
      timeline: extractTimeline(learnings),
      vendors: extractVendorRecommendations(learnings),
      budget: extractBudgetBreakdown(learnings, preferences.budget),
      recommendations: extractKeyRecommendations(learnings)
    };

    return plan;
  } catch (error) {
    console.error('Error generating wedding plan:', error);
    throw new Error('Failed to generate wedding plan. Please try again.');
  }
}

function extractVenueSuggestions(learnings: string[]): string {
  const venueInfo = learnings
    .filter(learning => learning.toLowerCase().includes('venue'))
    .join('\\n');
  return venueInfo || 'Venue suggestions will be provided based on your preferences';
}

function extractDecorIdeas(learnings: string[]): string {
  const decorInfo = learnings
    .filter(learning => learning.toLowerCase().includes('decor') || learning.toLowerCase().includes('decoration'))
    .join('\\n');
  return decorInfo || 'Decor suggestions will be customized to your style';
}

function extractTimeline(learnings: string[]): string {
  const timelineInfo = learnings
    .filter(learning => learning.toLowerCase().includes('timeline') || learning.toLowerCase().includes('schedule'))
    .join('\\n');
  return timelineInfo || 'A detailed timeline will be created for your special day';
}

function extractVendorRecommendations(learnings: string[]): string {
  const vendorInfo = learnings
    .filter(learning => learning.toLowerCase().includes('vendor') || learning.toLowerCase().includes('service'))
    .join('\\n');
  return vendorInfo || 'Vendor recommendations will be provided based on your needs';
}

function extractBudgetBreakdown(learnings: string[], totalBudget: string): string {
  const budgetInfo = learnings
    .filter(learning => learning.toLowerCase().includes('budget') || learning.toLowerCase().includes('cost'))
    .join('\\n');
  return budgetInfo || `Budget allocation suggestions for your ${totalBudget} budget`;
}

function extractKeyRecommendations(learnings: string[]): string {
  const uniqueRecommendations = new Set(
    learnings
      .filter(learning => learning.toLowerCase().includes('recommend') || learning.toLowerCase().includes('suggest'))
      .slice(0, 5)
  );
  return Array.from(uniqueRecommendations).join('\\n') || 'Custom recommendations will be provided';
}
