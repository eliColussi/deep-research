// /utils/ai/ai.ts
import type { WeddingPlan, PlanFormData } from '@/types/plan';

export async function generateWeddingPlan(
  preferences: PlanFormData
): Promise<WeddingPlan> {
  console.log('Sending wedding plan preferences to API:', preferences);
  
  const response = await fetch('/api/generate-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(preferences),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to generate wedding plan');
  }

  // Parse the response
  const data = await response.json();
  
  // Check if we have the new format with a plan property
  if (data.plan) {
    console.log('Received structured plan data');
    return data.plan as WeddingPlan;
  } else if (data.markdownPlan) {
    // Handle legacy format or create a basic plan from markdown
    console.log('Received markdown plan, converting to structured format');
    
    // Create a basic plan from the markdown
    const basicPlan: WeddingPlan = {
      id: `plan-${Date.now()}`,
      user_id: '',
      venue: 'Generated from research',
      decor: 'Generated from research',
      timeline: 'Generated from research',
      vendors: 'Generated from research',
      budget: 'Generated from research',
      recommendations: data.markdownPlan,
      initial_preferences: preferences,
    };
    
    return basicPlan;
  } else {
    throw new Error('Invalid response format from wedding plan API');
  }
}
