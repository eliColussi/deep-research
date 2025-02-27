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
    .eq('user_id', userId)
    .single()

  if (error) throw error
  return data
}

export async function createOrUpdateUserProfile(userId: string, data: any) {
  const { error } = await supabase
    .from('user_profiles')
    .upsert({
      user_id: userId,
      ...data,
      updated_at: new Date().toISOString(),
    })

  if (error) throw error
}

export async function updateUserPlanCount(userId: string, count: number) {
  const { error } = await supabase
    .from('user_profiles')
    .update({ plans_remaining: count, updated_at: new Date().toISOString() })
    .eq('user_id', userId)

  if (error) throw error
}

export async function saveWeddingPlan(userId: string, plan: WeddingPlan) {
  const { data, error } = await supabase
    .from('wedding_plans')
    .insert({
      user_id: userId,
      ...plan,
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateWeddingPlan(planId: string, updates: Partial<WeddingPlan>) {
  const { data, error } = await supabase
    .from('wedding_plans')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', planId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getWeddingPlans(userId: string) {
  const { data, error } = await supabase
    .from('wedding_plans')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getWeddingPlan(planId: string) {
  const { data, error } = await supabase
    .from('wedding_plans')
    .select('*')
    .eq('id', planId)
    .single()

  if (error) throw error
  return data
}
