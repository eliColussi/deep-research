// app/api/generate-plan/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { deepResearch, writeFinalReport } from '@/utils/ai/deep-research';
import type { PlanFormData, WeddingPlan } from '@/types/plan';

/**
 * Build a thorough prompt from the user's wedding preferences,
 * referencing phone numbers, reviews, star ratings, etc.
 */
function buildWeddingPrompt(preferences: PlanFormData) {
  return `
User wants a wedding plan with:
- Budget: ${preferences.budget}
- Guest count: ${preferences.guestCount}
- Location: ${preferences.location}
- Additional preferences: ${preferences.preferences}
- Date range: ${preferences.dateRange}

Preferred Season: ${preferences.season || '(not specified)'}
Wedding Style: ${preferences.weddingStyle || '(not specified)'}
Color Palette: ${preferences.colorPalette || '(not specified)'}

We want extremely detailed research focusing on phone numbers, star ratings, user reviews,
niche local info, up-to-date pricing, hidden gems, and cutting-edge wedding ideas.
`;
}

export async function POST(req: NextRequest) {
  try {
    // 1) Parse request body
    const body = (await req.json()) as PlanFormData;

    // 2) Build an extremely thorough prompt
    const prompt = buildWeddingPrompt(body);

    // 3) Control how many queries we run (breadth) & recursion depth
    // Adjust based on the complexity of the request
    const breadth = body.preferences?.length > 100 ? 3 : 2; // More breadth for complex requests
    const depth = 2; // Keep depth consistent for now

    console.log(`Starting deep research with breadth=${breadth}, depth=${depth}`);

    // 4) Run the deep research with Serper-based search
    const { learnings, visitedUrls } = await deepResearch({
      query: prompt,
      breadth,
      depth,
      // We could add progress tracking here if we had a way to stream it back to the client
    });

    // 5) Produce a final “report” from the agent
    console.log(`Deep research complete. Found ${learnings.length} learnings and ${visitedUrls.length} sources`);
    
    const reportMarkdown = await writeFinalReport({
      prompt,
      learnings,
      visitedUrls,
    });

    // 6) Parse the markdown into structured sections for the wedding plan
    // This is a simplified approach - in a real implementation we might want to
    // use a more robust parsing strategy or have the AI return structured data directly
    const sections = reportMarkdown.split('##').filter(Boolean);
    
    // Create a structured plan object
    const structuredPlan: Partial<WeddingPlan> = {
      id: `plan-${Date.now()}`,
      user_id: '', // Will be set by the client
      venue: sections.find(s => s.toLowerCase().includes('venue'))?.trim() || 'Venue recommendations based on your preferences',
      decor: sections.find(s => s.toLowerCase().includes('decor') || s.toLowerCase().includes('theme'))?.trim() || 'Decor suggestions tailored to your style',
      timeline: sections.find(s => s.toLowerCase().includes('timeline') || s.toLowerCase().includes('schedule'))?.trim() || 'Suggested wedding day timeline',
      vendors: sections.find(s => s.toLowerCase().includes('vendor'))?.trim() || 'Recommended vendors with contact information',
      budget: sections.find(s => s.toLowerCase().includes('budget'))?.trim() || 'Budget breakdown and recommendations',
      recommendations: sections.find(s => s.toLowerCase().includes('recommendation') || s.toLowerCase().includes('suggestion'))?.trim() || 'Additional recommendations based on your preferences',
      initial_preferences: body,
    };

    // 7) Return both the structured plan and the full markdown
    return NextResponse.json({
      plan: structuredPlan,
      markdownPlan: reportMarkdown,
      learnings,
      visitedUrls,
    });
  } catch (err: unknown) {
    console.error('Error generating plan:', err);
    // Safely handle unknown error
    let message = 'Failed to generate wedding plan';
    if (err instanceof Error) {
      message = err.message;
    }
    return new NextResponse(message, { status: 500 });
  }
}
