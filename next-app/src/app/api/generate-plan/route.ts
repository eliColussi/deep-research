// app/api/generate-plan/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { deepResearch, writeFinalReport } from '@/utils/ai/deep-research';
import type { PlanFormData } from '@/types/plan';

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
    //    Adjust to your usage & rate-limit constraints
    const breadth = 2;
    const depth = 2;

    // 4) Run the deep research with Serper-based search
    const { learnings, visitedUrls } = await deepResearch({
      query: prompt,
      breadth,
      depth,
      // Optionally define onProgress if you want logs
    });

    // 5) Produce a final “report” from the agent
    const reportMarkdown = await writeFinalReport({
      prompt,
      learnings,
      visitedUrls,
    });

    // 6) Return the plan
    return NextResponse.json({
      markdownPlan: reportMarkdown,
      learnings,
      visitedUrls,
    });
  } catch (err: any) {
    console.error('Error generating plan:', err);
    return new NextResponse(err.message || 'Failed to generate wedding plan', {
      status: 500,
    });
  }
}
