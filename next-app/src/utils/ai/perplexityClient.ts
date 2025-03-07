import type { PlanFormData, WeddingPlan } from '@/types/plan';

/**
 * Generic function to get a response from Perplexity API
 */
export async function getPerplexityResponse(messages: { role: string; content: string }[]) {
  const res = await fetch('/api/perplexity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch from Perplexity: ${res.status}`);
  }
  
  const data = await res.json();
  return data.choices[0].message.content;
}

/**
 * Build a thorough prompt from the user's wedding preferences
 */
function buildWeddingPrompt(preferences: PlanFormData): string {
  return `
User wants a DETAILED wedding plan with:
- Budget: ${preferences.budget}
- Guest count: ${preferences.guestCount}
- Location: ${preferences.location}
- Additional preferences: ${preferences.preferences}
- Date range: ${preferences.dateRange}

Preferred Season: ${preferences.season || '(not specified)'}
Wedding Style: ${preferences.weddingStyle || '(not specified)'}
Color Palette: ${preferences.colorPalette || '(not specified)'}

We need HIGHLY SPECIFIC research focusing on:
1. EXACT venue details:
   - Full venue names with complete contact information
   - Precise phone numbers with country/area codes
   - Exact website URLs and email addresses
   - Physical addresses with postal codes

2. DETAILED vendor information:
   - Specific photographer names, packages, and pricing
   - Exact catering companies with menu options and per-person costs
   - Specific florist businesses with package details

3. PRECISE ratings and reviews:
   - Exact star ratings with decimal points (e.g., 4.8/5)
   - Number of reviews (e.g., "based on 127 reviews")
   - Direct quotes from actual reviews with reviewer names

4. SPECIFIC pricing information:
   - Exact package costs with currency symbols
   - Detailed price breakdowns by category
   - Seasonal pricing variations with specific dates

Find the most up-to-date, specific information possible. Include direct contact details for all venues and vendors.
`;
}

/**
 * Generate a wedding plan using Perplexity's sonar-deep-research model
 */
export async function generateWeddingPlan(preferences: PlanFormData) {
  // Create the messages array for the API
  const messages = [
    {
      role: 'system',
      content: 'You are a professional wedding planner with extensive knowledge of venues, vendors, and wedding trends. Provide detailed, specific information with exact names, contact details, and pricing. Format your response in markdown with clear sections for venues, decor, timeline, vendors, budget, and recommendations.'
    },
    {
      role: 'user',
      content: buildWeddingPrompt(preferences)
    }
  ];

  try {
    // Get the response from Perplexity
    const markdownPlan = await getPerplexityResponse(messages);
    
    // Parse the markdown into structured sections
    const sections = markdownPlan.split('##').filter(Boolean);
    
    // Create a structured plan object
    const structuredPlan: Partial<WeddingPlan> = {
      id: `plan-${Date.now()}`,
      user_id: '', // Will be set by the client
      venue: sections.find((s: string) => s.toLowerCase().includes('venue'))?.trim() || 'Venue recommendations based on your preferences',
      decor: sections.find((s: string) => s.toLowerCase().includes('decor') || s.toLowerCase().includes('theme'))?.trim() || 'Decor suggestions tailored to your style',
      timeline: sections.find((s: string) => s.toLowerCase().includes('timeline') || s.toLowerCase().includes('schedule'))?.trim() || 'Suggested wedding day timeline',
      vendors: sections.find((s: string) => s.toLowerCase().includes('vendor'))?.trim() || 'Recommended vendors with contact information',
      budget: sections.find((s: string) => s.toLowerCase().includes('budget'))?.trim() || 'Budget breakdown and recommendations',
      recommendations: sections.find((s: string) => s.toLowerCase().includes('recommendation') || s.toLowerCase().includes('suggestion'))?.trim() || 'Additional recommendations based on your preferences',
      initial_preferences: preferences,
    };
    
    return {
      plan: structuredPlan,
      markdownPlan,
    };
  } catch (error) {
    console.error('Error generating wedding plan:', error);
    throw error;
  }
}