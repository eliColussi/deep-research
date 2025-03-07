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
I need a COMPREHENSIVE, ACTIONABLE wedding plan with these specific requirements:

## WEDDING DETAILS
- Budget: ${preferences.budget}
- Guest count: ${preferences.guestCount}
- Location: ${preferences.location}
- Date range: ${preferences.dateRange}
- Season: ${preferences.season || '(not specified)'}
- Wedding Style: ${preferences.weddingStyle || '(not specified)'}
- Color Palette: ${preferences.colorPalette || '(not specified)'}
- Additional preferences: ${preferences.preferences}

## RESEARCH REQUIREMENTS

1. VENUES - Find 3-5 specific venues that match my requirements with:
   - Complete business names and descriptions
   - Exact capacity limits and minimum/maximum guest counts
   - Full contact details (phone with area code, email, website URL)
   - Physical address with postal code
   - Available dates in my timeframe
   - Detailed pricing for my guest count
   - Exact ratings (e.g., "4.8/5 stars from 127 reviews")
   - 2-3 specific customer testimonials with reviewer names

2. VENDORS - Research specific vendors for each category:
   - CATERING: Company names, menu options, per-person costs, minimum orders
   - PHOTOGRAPHY: Specific photographers, package details, exact pricing, portfolio links
   - FLORISTS: Business names, pastel arrangement options, pricing for my color palette
   - TRANSPORTATION: Limo/transportation services with vehicle options and hourly rates
   - ENTERTAINMENT: DJ/band options with package details and pricing

3. DETAILED TIMELINE - Create a comprehensive wedding day schedule:
   - Exact timing for each activity (preparation, ceremony, photos, reception)
   - Vendor arrival/setup times
   - Transportation logistics with pickup/dropoff times
   - Reception flow with meal service timing

4. COMPLETE BUDGET BREAKDOWN - Provide an itemized budget with:
   - Exact costs for each category (venue, catering, photography, etc.)
   - Per-person costs where applicable
   - Realistic price ranges based on current market rates
   - Percentage allocation of total budget
   - Potential cost-saving options

IMPORTANT: Include SPECIFIC names, numbers, and details for EVERY recommendation. Do not use placeholders or generic information. All venues and vendors must be real, currently operating businesses with accurate contact information and pricing.

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
      content: `You are a professional wedding planner with extensive knowledge of venues, vendors, and wedding trends. Your task is to create a COMPREHENSIVE, DETAILED wedding plan with SPECIFIC, ACTIONABLE information.

YOUR RESPONSE MUST INCLUDE:
1. EXACT venue names with COMPLETE contact information (phone numbers with area codes, websites, emails, physical addresses)
2. DETAILED vendor information (specific business names, package details, pricing)
3. PRECISE ratings and reviews (exact star ratings, number of reviews, direct quotes from customers)
4. COMPREHENSIVE timeline with specific times and activities
5. DETAILED budget breakdown with exact costs for each category

Format your response as ONE COHESIVE DOCUMENT using markdown with:
- # for main title
- ## for major sections
- ### for subsections
- Bullet points for lists
- Bold text for important information
- Tables for pricing comparisons where appropriate

Do NOT separate your response into disconnected sections with repeated titles. Create ONE flowing document that covers all aspects of the wedding plan.

Write in a direct, personal tone as if speaking to the couple. Include ALL the specific details you find - this is CRITICAL. The couple needs EXACT information to make decisions.`
    },
    {
      role: 'user',
      content: buildWeddingPrompt(preferences)
    }
  ];

  try {
    // Get the response from Perplexity
    const markdownPlan = await getPerplexityResponse(messages);
    
    // Extract main sections from the markdown
    // We'll use a more robust approach to identify sections
    const extractSection = (content: string, sectionKeywords: string[], defaultValue: string) => {
      // First try to find a section header (## Section Title)
      const sectionRegexes = sectionKeywords.map(keyword => 
        new RegExp(`##\\s*[^\n]*${keyword}[^\n]*\n([\s\S]*?)(?=\n##|$)`, 'i')
      );
      
      for (const regex of sectionRegexes) {
        const match = content.match(regex);
        if (match && match[1]) {
          return match[0].trim();
        }
      }
      
      // If no section header found, look for content containing the keywords
      for (const keyword of sectionKeywords) {
        const paragraphs = content.split('\n\n');
        const relevantParagraphs = paragraphs.filter(p => 
          p.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (relevantParagraphs.length > 0) {
          return relevantParagraphs.join('\n\n').trim();
        }
      }
      
      return defaultValue;
    };
    
    // Create a structured plan object
    const structuredPlan: Partial<WeddingPlan> = {
      id: `plan-${Date.now()}`,
      user_id: '', // Will be set by the client
      venue: extractSection(markdownPlan, ['venue', 'location', 'place'], 'Venue recommendations based on your preferences'),
      decor: extractSection(markdownPlan, ['decor', 'theme', 'style', 'design'], 'Decor suggestions tailored to your style'),
      timeline: extractSection(markdownPlan, ['timeline', 'schedule', 'itinerary', 'agenda'], 'Suggested wedding day timeline'),
      vendors: extractSection(markdownPlan, ['vendor', 'supplier', 'service', 'catering', 'photography', 'florist'], 'Recommended vendors with contact information'),
      budget: extractSection(markdownPlan, ['budget', 'cost', 'price', 'expense'], 'Budget breakdown and recommendations'),
      recommendations: extractSection(markdownPlan, ['recommendation', 'suggestion', 'advice', 'tip'], 'Additional recommendations based on your preferences'),
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