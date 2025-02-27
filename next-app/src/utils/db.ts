// utils/db.ts

import type { Database } from '@/types/database';
import { supabase } from '@/app/lib/supabaseClient';
import type { WeddingPlan, PlanFormData } from '@/types/plan';

// Get user profile with .maybeSingle() so zero rows returns null
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle(); // Returns null if no row

  if (error) {
    // If there's a real error, throw it
    console.error('getUserProfile error:', error);
    throw error;
  }
  return data;
}

// Create or update a user profile
export async function createOrUpdateUserProfile(userId: string, email: string) {
  console.log('Creating/updating profile for:', userId, email);

  // 1) Attempt an upsert (which does insert if row not found, else update)
  //    This is simpler than separate insert + update calls.
  //    If you really want separate calls, see the note below.
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({
      id: userId,
      email,
      revisions_remaining: 2,
      last_login: new Date().toISOString(),
    })
    .select()
    .single(); // Upsert should return exactly one row if successful

  if (error) {
    console.error('createOrUpdateUserProfile error:', error);
    throw error;
  }

  console.log('Profile upserted successfully:', data);
  return data;
}

/*
  NOTE: If you prefer the separate insert-then-update approach, you can do:
  
  // Insert first
  const { data: insertData, error: insertError } = await supabase
    .from('user_profiles')
    .insert({
      id: userId,
      email,
      revisions_remaining: 2,
    })
    .select()
    .single();

  if (!insertError) {
    return insertData;
  }

  // If insert fails, do an update
  const { data: updateData, error: updateError } = await supabase
    .from('user_profiles')
    .update({ email, last_login: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  if (updateError) throw updateError;
  return updateData;
*/

// Decrement the user's revision count or do other plan count logic
export async function updateUserPlanCount(userId: string) {
  // 1) Fetch the existing profile to get current 'revisions_remaining'
  const { data: profile, error: getError } = await supabase
    .from('user_profiles')
    .select('revisions_remaining')
    .eq('id', userId)
    .single();

  if (getError) {
    console.error('updateUserPlanCount fetch error:', getError);
    throw getError;
  }
  if (!profile) {
    throw new Error('Profile not found');
  }

  // 2) Decrement the count, but not below 0
  const newCount = Math.max(0, (profile.revisions_remaining ?? 2) - 1);

  // 3) Update the profile with the new count
  const { data, error: updateError } = await supabase
    .from('user_profiles')
    .update({ revisions_remaining: newCount })
    .eq('id', userId)
    .select()
    .single();

  if (updateError) {
    console.error('updateUserPlanCount update error:', updateError);
    throw updateError;
  }
  return data;
}

// Insert a new wedding plan
export async function saveWeddingPlan(
  userId: string,
  plan: WeddingPlan,
  preferences: PlanFormData
) {
  const { data, error } = await supabase
    .from('wedding_plans')
    .insert({
      user_id: userId,
      current_plan: plan,
      initial_preferences: preferences,
    })
    .select()
    .single();

  if (error) {
    console.error('saveWeddingPlan error:', error);
    throw error;
  }
  return data;
}

// Update an existing wedding plan
export async function updateWeddingPlan(
  userId: string,
  plan: WeddingPlan,
  preferences: PlanFormData
) {
  // We assume user_id is unique in wedding_plans
  // If your table uses a different PK, adjust accordingly
  const { data, error } = await supabase
    .from('wedding_plans')
    .update({
      current_plan: plan,
      initial_preferences: preferences,
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('updateWeddingPlan error:', error);
    throw error;
  }
  return data;
}
