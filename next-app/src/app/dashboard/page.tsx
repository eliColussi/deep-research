'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';
import type { WeddingPlan, PlanFormData } from '@/types/plan';
import { getUserProfile, createOrUpdateUserProfile, updateUserPlanCount, saveWeddingPlan, updateWeddingPlan } from '@/utils/db';
import { generateWeddingPlan } from '@/utils/ai';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [revisionsLeft, setRevisionsLeft] = useState(2);
  const [plan, setPlan] = useState<WeddingPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<PlanFormData>({
    budget: '',
    guestCount: 0,
    location: '',
    preferences: '',
    dateRange: ''
  });

  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      try {
        // Check if user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('Auth error:', authError);
          router.push('/login');
          return;
        }

        if (!user) {
          router.push('/login');
          return;
        }

        // Get or create user profile
        try {
          let profile = await getUserProfile(user.id);
          
          if (!profile) {
            console.log('Creating new user profile...');
            profile = await createOrUpdateUserProfile(user.id, user.email!);
          }

          setUser(user);
          setRevisionsLeft(profile?.revisions_remaining ?? 2);

          // Get existing plan if any
          const { data: existingPlan, error: planError } = await supabase
            .from('wedding_plans')
            .select('current_plan')
            .eq('user_id', user.id)
            .single();

          if (planError && planError.code !== 'PGRST116') { // Ignore 'no rows returned' error
            console.error('Error fetching plan:', planError);
          } else if (existingPlan?.current_plan) {
            setPlan(existingPlan.current_plan as WeddingPlan);
          }

        } catch (error) {
          console.error('Error getting/creating profile:', error);
          // Don't redirect, just log the error and continue
          // The trigger might still be creating the profile
        }
      } catch (error) {
        console.error('Error in checkUser:', error);
        router.push('/login');
      }
    };

    checkUser();
  }, [router]); // Add router to dependency array

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('Please log in to continue');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Check if user has revisions left
      if (revisionsLeft <= 0) {
        setError('No revisions remaining');
        return;
      }

      // Generate AI wedding plan
      const newPlan = await generateWeddingPlan(formData);

      // Update plan in database
      if (plan) {
        const updated = await updateWeddingPlan(user.id, newPlan, formData);
        if (!updated) {
          throw new Error('Failed to update wedding plan');
        }
      } else {
        const saved = await saveWeddingPlan(user.id, newPlan, formData);
        if (!saved) {
          throw new Error('Failed to save wedding plan');
        }
      }

      // Update user's revision count
      const updatedProfile = await updateUserPlanCount(user.id);
      
      setPlan(newPlan);
      setRevisionsLeft(updatedProfile.revisions_remaining);
    } catch (error) {
      console.error('Error generating plan:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while generating your plan');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      {/* Header */}
      <header className="border-b border-pink-100 bg-white/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold bg-gradient-to-r from-pink-500 to-purple-500 text-transparent bg-clip-text">
            Wedding Planner AI
          </h1>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}
        {/* Revisions Counter */}
        <div className="bg-white/50 backdrop-blur-sm rounded-full px-4 py-2 inline-block">
          <p className="text-sm text-gray-600">
            Revisions remaining: <span className="font-semibold text-purple-600">{revisionsLeft} of 2</span>
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-pink-100 p-8">
          {!plan ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget Range</label>
                  <select
                    className="w-full rounded-lg border-gray-200 focus:border-pink-500 focus:ring-pink-500"
                    value={formData.budget}
                    onChange={e => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                  >
                    <option value="">Select budget</option>
                    <option value="10-20k">$10,000 - $20,000</option>
                    <option value="20-30k">$20,000 - $30,000</option>
                    <option value="30-50k">$30,000 - $50,000</option>
                    <option value="50k+">$50,000+</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Guest Count</label>
                  <input
                    type="number"
                    className="w-full rounded-lg border-gray-200 focus:border-pink-500 focus:ring-pink-500"
                    value={formData.guestCount}
                    onChange={e => setFormData(prev => ({ ...prev, guestCount: parseInt(e.target.value) }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  className="w-full rounded-lg border-gray-200 focus:border-pink-500 focus:ring-pink-500"
                  value={formData.location}
                  onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="City, State or Country"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Preferences</label>
                <textarea
                  className="w-full rounded-lg border-gray-200 focus:border-pink-500 focus:ring-pink-500"
                  rows={4}
                  value={formData.preferences}
                  onChange={e => setFormData(prev => ({ ...prev, preferences: e.target.value }))}
                  placeholder="Tell us about your dream wedding..."
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-3 text-white font-medium hover:from-pink-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 transition-all duration-200"
              >
                {isLoading ? 'Generating Your Plan...' : 'Generate My Wedding Plan'}
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="prose prose-pink max-w-none">
                <h2 className="text-2xl font-semibold text-gray-900">Your Wedding Plan</h2>
                <div className="grid gap-6 sm:grid-cols-2">
                  {Object.entries(plan).map(([key, value]) => (
                    <div key={key} className="bg-pink-50/50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 capitalize mb-2">{key}</h3>
                      <p className="text-gray-600">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
              {revisionsLeft > 0 && (
                <button
                  onClick={() => setPlan(null)}
                  className="w-full rounded-lg border border-pink-200 bg-white px-6 py-3 text-pink-600 font-medium hover:bg-pink-50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 transition-all duration-200"
                >
                  Request a Revision
                </button>
              )}
              <button
                onClick={() => console.log('Download plan')}
                className="w-full rounded-lg border border-purple-200 bg-white px-6 py-3 text-purple-600 font-medium hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200"
              >
                Download Plan
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
