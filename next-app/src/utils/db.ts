import { createBrowserClient } from '@supabase/ssr'
import type { WeddingPlan, PlanFormData } from '@/types/plan'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

export async function createOrUpdateUserProfile(userId: string, email: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({
      id: userId,
      email,
      last_login: new Date().toISOString()
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateUserPlanCount(userId: string) {
  // First get current count
  const { data: profile, error: getError } = await supabase
    .from('user_profiles')
    .select('revisions_remaining')
    .eq('id', userId)
    .single()

  if (getError) throw getError
  if (!profile) throw new Error('Profile not found')

  // Then update with new count
  const { data, error } = await supabase
    .from('user_profiles')
    .update({ 
      revisions_remaining: Math.max(0, (profile.revisions_remaining ?? 2) - 1)
    })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function saveWeddingPlan(userId: string, plan: WeddingPlan, preferences: PlanFormData) {
  const { data, error } = await supabase
    .from('wedding_plans')
    .insert({
      user_id: userId,
      current_plan: plan,
      initial_preferences: preferences
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateWeddingPlan(userId: string, plan: WeddingPlan, preferences: PlanFormData) {
  const { data, error } = await supabase
    .from('wedding_plans')
    .update({
      current_plan: plan,
      initial_preferences: preferences
    })
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}
