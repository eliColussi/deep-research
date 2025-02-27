import { supabase } from '@/app/lib/supabaseClient';
import type { Database } from '@/types/database';
import type { WeddingPlan, PlanFormData } from '@/types/plan';

export async function getUserProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception in getUserProfile:', error);
    return null;
  }
}

export async function createOrUpdateUserProfile(userId: string, email: string) {
  try {
    // First check if profile exists
    const existingProfile = await getUserProfile(userId);
    
    if (existingProfile) {
      // Update last login time
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          last_login: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    // Create new profile
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        email,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
        payment_confirmed: false,
        plans_generated: 0,
        revisions_remaining: 2
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception in createOrUpdateUserProfile:', error);
    return null;
  }
}

export async function updateUserPlanCount(userId: string) {
  // First get current values
  const { data: currentProfile, error: fetchError } = await supabase
    .from('user_profiles')
    .select('plans_generated, revisions_remaining')
    .eq('id', userId)
    .single();

  if (fetchError) throw fetchError;
  if (!currentProfile) throw new Error('Profile not found');

  // Then update with new values
  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      plans_generated: (currentProfile.plans_generated || 0) + 1,
      revisions_remaining: Math.max(0, (currentProfile.revisions_remaining || 0) - 1)
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function saveWeddingPlan(
  userId: string,
  plan: WeddingPlan,
  preferences: PlanFormData
) {
  const { data, error } = await supabase
    .from('wedding_plans')
    .upsert({
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      current_plan: plan,
      initial_preferences: preferences,
      revision_history: []
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateWeddingPlan(
  userId: string,
  plan: WeddingPlan,
  preferences: PlanFormData
) {
  // First get the existing plan to update revision history
  const { data: existingPlan } = await supabase
    .from('wedding_plans')
    .select('*')
    .eq('user_id', userId)
    .single();

  const revisionHistory = existingPlan?.revision_history || [];
  revisionHistory.push({
    plan: existingPlan?.current_plan,
    preferences: preferences,
    timestamp: new Date().toISOString()
  });

  const { data, error } = await supabase
    .from('wedding_plans')
    .update({
      updated_at: new Date().toISOString(),
      current_plan: plan,
      revision_history: revisionHistory
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
