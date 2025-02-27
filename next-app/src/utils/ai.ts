import type { WeddingPlan, PlanFormData } from '@/types/plan'

export async function generateWeddingPlan(formData: PlanFormData): Promise<WeddingPlan> {
  try {
    const response = await fetch('/api/generate-plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    })

    if (!response.ok) {
      throw new Error('Failed to generate wedding plan')
    }

    const plan: WeddingPlan = await response.json()
    return plan
  } catch (error) {
    console.error('Error generating wedding plan:', error)
    throw error
  }
}
