// app/api/generate-plan/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateWeddingPlan } from '@/utils/ai/perplexityClient';
import type { PlanFormData } from '@/types/plan';

export async function POST(req: NextRequest) {
  try {
    // 1) Parse request body
    const body = (await req.json()) as PlanFormData;

    console.log('Generating wedding plan with Perplexity Sonar...');

    // 2) Generate the wedding plan using Perplexity's sonar-deep-research model
    const { plan, markdownPlan } = await generateWeddingPlan(body);

    console.log('Wedding plan generated successfully');

    // 3) Return both the structured plan and the full markdown
    return NextResponse.json({
      plan,
      markdownPlan,
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
