'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/app/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import type { WeddingPlan, PlanFormData } from '@/types/plan';
import {
  getUserProfile,
  createOrUpdateUserProfile,
  updateUserPlanCount,
  saveWeddingPlan,
  updateWeddingPlan,
} from '@/utils/db';
import { generateWeddingPlan } from '@/utils/ai/ai';
import NavBar from './navBar'; // import your existing NavBar
import { plans, handleCheckout } from '@/stripe/Pricing';

// Subscription Button Component
function SubscriptionButton({ user }: { user: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  
  // Set up portal container on mount
  useEffect(() => {
    setPortalContainer(document.body);
  }, []);
  
  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Calculate dropdown position based on button position
  const getDropdownPosition = (): React.CSSProperties => {
    if (!buttonRef.current) return {};
    
    const rect = buttonRef.current.getBoundingClientRect();
    return {
      position: 'fixed' as const,
      top: `${rect.bottom + window.scrollY + 10}px`,
      right: `${window.innerWidth - rect.right}px`,
    };
  };
  
  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-lg hover:from-rose-600 hover:to-rose-700 transition-all duration-200 font-medium text-sm flex items-center gap-2 shadow-md"
      >
        Subscribe to Plan
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && portalContainer && createPortal(
        <div 
          className="w-72 bg-white rounded-lg shadow-xl z-50 overflow-hidden border border-gray-200"
          style={getDropdownPosition()}
        >
          <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-rose-50 to-purple-50">
            <h4 className="font-semibold text-gray-800">Choose Your Subscription</h4>
            <p className="text-xs text-gray-600 mt-1">Select a plan to unlock premium features</p>
          </div>
          <div className="p-4 space-y-3">
            {/* Monthly Plan */}
            <button
              onClick={() => handleCheckout('monthly', user?.email)}
              className="block w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-800">Essential</p>
                  <p className="text-sm text-gray-500">$19/month</p>
                </div>
                <span className="text-rose-500 text-sm font-medium">Select →</span>
              </div>
            </button>
            
            {/* Yearly Plan */}
            <button
              onClick={() => handleCheckout('yearly', user?.email)}
              className="block w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors border-l-2 border-rose-500"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-800">Premium</p>
                  <p className="text-sm text-gray-500">$99/year</p>
                  <p className="text-xs text-rose-500 mt-1">Best Value</p>
                </div>
                <span className="text-rose-500 text-sm font-medium">Select →</span>
              </div>
            </button>
          </div>
        </div>,
        portalContainer
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [revisionsLeft, setRevisionsLeft] = useState(2);
  const [plan, setPlan] = useState<WeddingPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Extended form data for a more detailed plan
  const [formData, setFormData] = useState<PlanFormData>({
    budget: '',
    guestCount: 0,
    location: '',
    preferences: '',
    dateRange: '',
    season: '', // e.g. "spring"
    weddingStyle: '', // e.g. "Classic"
    colorPalette: '', // e.g. "pastel"
  });

  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Check user session
  useEffect(() => {
    const checkUser = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          router.push('/login');
          return;
        }
        if (!session) {
          router.push('/login');
          return;
        }

        const currentUser = session.user;
        if (!currentUser) {
          console.error('No user in session');
          router.push('/login');
          return;
        }

        // Get or create user profile
        let profile = await getUserProfile(currentUser.id);
        if (!profile) {
          profile = await createOrUpdateUserProfile(currentUser.id, currentUser.email!);
        }

        setUser(currentUser);
        setRevisionsLeft(profile.revisions_remaining ?? 2);

        // Check for existing plan
        const { data: existingPlan, error: planError } = await supabase
          .from('wedding_plans')
          .select('current_plan')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (planError) {
          console.error('Error fetching plan:', planError);
        } else if (existingPlan?.current_plan) {
          setPlan(existingPlan.current_plan as WeddingPlan);
        }
      } catch (err) {
        console.error('Error in checkUser:', err);
        router.push('/login');
      }
    };

    checkUser();
  }, [router]);

  // Handle form submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      setError('Please log in to continue');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (revisionsLeft <= 0) {
        setError('No revisions remaining');
        return;
      }

      // Generate AI wedding plan
      const newPlan = await generateWeddingPlan(formData);

      // Save or update
      if (plan) {
        const updated = await updateWeddingPlan(user.id, newPlan, formData);
        if (!updated) throw new Error('Failed to update wedding plan');
      } else {
        const saved = await saveWeddingPlan(user.id, newPlan, formData);
        if (!saved) throw new Error('Failed to save wedding plan');
      }

      // Decrement revision count
      const updatedProfile = await updateUserPlanCount(user.id);
      setPlan(newPlan);
      setRevisionsLeft(updatedProfile.revisions_remaining);
    } catch (err: any) {
      console.error('Error generating plan:', err);
      setError(err.message || 'An error occurred while generating your plan');
    } finally {
      setIsLoading(false);
    }
  }

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

      {/* NavBar */}
      <NavBar />
      
      {/* Subscription Banner */}
      <div className="max-w-4xl mx-auto px-6 py-4">
        <div className="bg-gradient-to-r from-rose-50 to-purple-50 rounded-xl p-4 shadow-sm border border-rose-100 flex items-center justify-between relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute -left-4 -top-4 w-16 h-16 bg-rose-200 rounded-full opacity-20"></div>
          <div className="absolute right-20 bottom-0 w-24 h-24 bg-purple-200 rounded-full opacity-20"></div>
          
          <div className="relative">
            <h3 className="text-lg font-semibold text-gray-800">Upgrade Your Wedding Planning Experience</h3>
            <p className="text-sm text-gray-600">Get access to premium features and unlimited revisions</p>
          </div>
          <SubscriptionButton user={user} />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
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
            Revisions remaining:{' '}
            <span className="font-semibold text-purple-600">{revisionsLeft} of 2</span>
          </p>
        </div>

        {/* Plan Form / Plan Display */}
        <div className="bg-white rounded-2xl shadow-sm border border-pink-100 p-8">
          {!plan ? (
            /* Form Section */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Budget & Guest Count */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Budget Range
                  </label>
                  <select
                    className="w-full rounded-lg border-gray-200 focus:border-pink-500 focus:ring-pink-500"
                    value={formData.budget}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, budget: e.target.value }))
                    }
                  >
                    <option value="">Select budget</option>
                    <option value="10-20k">💰 $10,000 - $20,000</option>
                    <option value="20-30k">💰 $20,000 - $30,000</option>
                    <option value="30-50k">💰 $30,000 - $50,000</option>
                    <option value="50k+">💰 $50,000+</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Guest Count
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-lg border-gray-200 focus:border-pink-500 focus:ring-pink-500"
                    value={formData.guestCount}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        guestCount: parseInt(e.target.value),
                      }))
                    }
                    placeholder="E.g. 100"
                  />
                </div>
              </div>

              {/* Location & Date Range */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-lg border-gray-200 focus:border-pink-500 focus:ring-pink-500"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, location: e.target.value }))
                    }
                    placeholder="City, State or Country"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date Range
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-lg border-gray-200 focus:border-pink-500 focus:ring-pink-500"
                    value={formData.dateRange}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, dateRange: e.target.value }))
                    }
                    placeholder="e.g. June 2025 or a specific date"
                  />
                </div>
              </div>

              {/* Season & Wedding Style */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preferred Season
                  </label>
                  <select
                    className="w-full rounded-lg border-gray-200 focus:border-pink-500 focus:ring-pink-500"
                    value={formData.season}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, season: e.target.value }))
                    }
                  >
                    <option value="">Select season</option>
                    <option value="spring">🌸 Spring</option>
                    <option value="summer">🌞 Summer</option>
                    <option value="fall">🍂 Fall</option>
                    <option value="winter">❄️ Winter</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Wedding Style
                  </label>
                  <select
                    className="w-full rounded-lg border-gray-200 focus:border-pink-500 focus:ring-pink-500"
                    value={formData.weddingStyle}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, weddingStyle: e.target.value }))
                    }
                  >
                    <option value="">Select style</option>
                    <option value="classic">✨ Classic</option>
                    <option value="boho">🌿 Boho</option>
                    <option value="modern">💎 Modern</option>
                    <option value="rustic">🏵 Rustic</option>
                  </select>
                </div>
              </div>

              {/* Color Palette */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color Palette
                </label>
                <select
                  className="w-full rounded-lg border-gray-200 focus:border-pink-500 focus:ring-pink-500"
                  value={formData.colorPalette}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, colorPalette: e.target.value }))
                  }
                >
                  <option value="">Select palette</option>
                  <option value="pastel">🌈 Pastel</option>
                  <option value="vibrant">🌟 Vibrant</option>
                  <option value="neutral">🤍 Neutral</option>
                  <option value="dark">🌑 Dark</option>
                </select>
              </div>

              {/* Additional Preferences */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Preferences
                </label>
                <textarea
                  className="w-full rounded-lg border-gray-200 focus:border-pink-500 focus:ring-pink-500"
                  rows={4}
                  value={formData.preferences}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, preferences: e.target.value }))
                  }
                  placeholder="Tell us about your dream wedding..."
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-3 text-white font-medium hover:from-pink-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 transition-all duration-200"
              >
                {isLoading ? 'Generating Your Plan...' : 'Generate My Wedding Plan'}
              </button>
            </form>
          ) : (
            /* If plan already exists, show the plan details */
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
