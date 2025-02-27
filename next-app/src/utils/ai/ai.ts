// ai.ts
import type { WeddingPlan, PlanFormData } from '@/types/plan';

export async function generateWeddingPlan(
  preferences: PlanFormData
): Promise<WeddingPlan> {
  const response = await fetch('/api/generate-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(preferences),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to generate wedding plan');
  }

  return response.json();
}
