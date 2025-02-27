// app/api/generate-plan/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { deepResearch, writeFinalReport } from '@/app/deep-research';
// If you want to do a simpler approach, you can skip writeFinalReport
// or only call deepResearch. This is an example.
import type { PlanFormData } from '@/types/plan';

// Build a simple "prompt" from the user's wedding preferences
function buildWeddingPrompt(preferences: PlanFormData) {
  return `
User wants a wedding plan with:
- Budget: ${preferences.budget}
- Guest count: ${preferences.guestCount}
- Location: ${preferences.location}
- Additional preferences: ${preferences.preferences}
- Date range: ${preferences.dateRange}
`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as PlanFormData;

    // 1) Construct a short “prompt” for deepResearch
    const prompt = buildWeddingPrompt(body);

    // 2) Run your deepResearch code with some fixed “breadth” and “depth”
    //    If you want a single pass, keep them small. If you want more extensive, increase them.
    const breadth = 2;
    const depth = 1;

    // This triggers your SERP-based logic, so Firecrawl will attempt to search the web
    const { learnings, visitedUrls } = await deepResearch({
      query: prompt,
      breadth,
      depth,
      // Optionally define an onProgress callback if you want to log progress
    });

    // 3) Optionally produce a final “report” from the agent
    //    If you just want the “learnings,” skip writeFinalReport.
    const reportMarkdown = await writeFinalReport({
      prompt,
      learnings,
      visitedUrls,
    });

    // 4) For the front end, you might parse or transform the “reportMarkdown” 
    //    into a structured object if you want. For now, let's return the raw text.
    //    The "WeddingPlan" could be the entire markdown or a JSON structure 
    //    you produce in writeFinalReport.
    return NextResponse.json({
      markdownPlan: reportMarkdown,
      learnings,
      visitedUrls,
    });
  } catch (err: any) {
    console.error('Error generating plan:', err);
    return new NextResponse(
      err.message || 'Failed to generate wedding plan',
      { status: 500 },
    );
  }
}
