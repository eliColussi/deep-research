'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import type { WeddingPlan, PlanFormData } from '@/types/plan';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import {
  getUserProfile,
  createOrUpdateUserProfile,
  updateUserPlanCount,
  saveWeddingPlan,
  updateWeddingPlan,
} from '@/utils/db';
import { generateWeddingPlan } from '@/utils/ai/perplexityClient';

import SubscriptionButton from './SubscriptionButton';
import PlanWizard from './PlanWizard'; // <-- Your multi-step wizard

// ------------------ Side Navigation ------------------ //
function SideNav({
  user,
  paymentConfirmed,
  onSignOut,
}: {
  user: any;
  paymentConfirmed: boolean;
  onSignOut: () => void;
}) {
  return (
    <aside
      className="
        fixed
        top-0
        left-0
        h-screen
        w-64
        bg-white
        shadow-xl
        border-r border-gray-200
        p-6
        flex
        flex-col
        justify-between
        z-50
      "
    >
      <div>
        {/* Move brand to side nav (top-left) */}
        <h1 className="text-2xl font-extrabold text-gray-800 mb-8 tracking-tight">
          Wedding Planner AI
        </h1>

        {/* “Add New” button */}
        <button
          className="
            w-full
            py-2
            px-4
            bg-black
            text-white
            rounded-lg
            flex
            items-center
            justify-center
            gap-2
            mb-8
            hover:bg-gray-900
            transition-colors
            duration-200
            shadow
          "
        >
          + Add New
        </button>

        {/* “Dashboard 12” item */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-base font-semibold text-gray-800">Dashboard</span>
          <span className="text-xs bg-red-500 text-white rounded-full px-2 py-0.5 shadow-sm">
            12
          </span>
        </div>

        {/* AI Assistant ✨ button with gradient border */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-500 p-[1px] rounded-lg">
          <button
            className="
              w-full
              rounded-md
              bg-white
              py-2
              px-4
              text-sm
              text-gray-700
              font-medium
              hover:bg-gray-50
              transition
            "
          >
            AI Assistant ✨
          </button>
        </div>
      </div>

      {/* Sign Out Button */}
      <div className="mt-auto">
        <button
          onClick={onSignOut}
          className="w-full py-2 px-4 mb-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors duration-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
        
        {/* Bottom Section: user info */}
        <div className="flex items-center gap-3">
          {/* Example avatar (replace with real user image if you have it) */}
          
          <div className="leading-tight">
            <div className="text-sm font-semibold text-gray-800">
              {user?.user_metadata?.name || 'User'}
            </div>
            <div className="text-xs text-gray-500">
              {user?.email || 'hello@example.com'}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ------------------ Main Dashboard Page ------------------ //
export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [revisionsLeft, setRevisionsLeft] = useState(2);
  const [plan, setPlan] = useState<WeddingPlan | null>(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [researchProgress, setResearchProgress] = useState<{
    stage: string;
    percent: number;
  }>({ stage: '', percent: 0 });

  // For any default wizard data you want to prefill
  const [formData, setFormData] = useState<PlanFormData>({
    budget: '',
    guestCount: 0,
    location: '',
    preferences: '',
    dateRange: '',
    season: '',
    weddingStyle: '',
    colorPalette: '',
  });

  const router = useRouter();

  // ------------------ On Mount: Check User Session & Load Data ------------------ //
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

        // If user has paid
        if (profile.payment_confirmed) {
          setPaymentConfirmed(true);
        }

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

  // ------------------ handleWizardFinalSubmit: Called by PlanWizard on final step ------------------ //
  async function handleWizardFinalSubmit(wizardData: PlanFormData) {
    if (!user) {
      setError('Please log in to continue');
      return;
    }

    if (revisionsLeft <= 0) {
      setError('No revisions remaining');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Starting AI wedding plan generation with deep research...');
      
      // Save form data for potential future use
      setFormData(wizardData);
      
      // Update research progress
      setResearchProgress({ stage: 'Initializing research...', percent: 10 });
      
      // Set up progress tracking with timeouts to simulate progress
      const progressStages = [
        { stage: 'Gathering information...', percent: 25 },
        { stage: 'Analyzing wedding venues...', percent: 40 },
        { stage: 'Researching vendors...', percent: 55 },
        { stage: 'Finding best deals...', percent: 70 },
        { stage: 'Compiling recommendations...', percent: 85 },
        { stage: 'Finalizing your plan...', percent: 95 }
      ];
      
      // Simulate progress updates
      progressStages.forEach((stage, index) => {
        setTimeout(() => {
          setResearchProgress(stage);
        }, (index + 1) * 3000); // Update every 3 seconds
      });
      
      // Generate AI wedding plan with Perplexity Sonar
      const planResult = await generateWeddingPlan(wizardData);
      console.log('Wedding plan generated successfully:', planResult);
      
      // Extract the plan from the result
      const weddingPlan: WeddingPlan = {
        id: planResult.plan.id || `plan-${Date.now()}`,
        user_id: user.id,
        venue: planResult.plan.venue || '',
        decor: planResult.plan.decor || '',
        timeline: planResult.plan.timeline || '',
        vendors: planResult.plan.vendors || '',
        budget: planResult.plan.budget || '',
        recommendations: planResult.plan.recommendations || '',
        initial_preferences: wizardData,
        markdownPlan: planResult.markdownPlan || ''
      };
      
      // Complete the progress
      setResearchProgress({ stage: 'Plan completed!', percent: 100 });

      // Log the markdown plan for debugging
      console.log('Markdown plan content:', weddingPlan.markdownPlan ? 
        `${weddingPlan.markdownPlan.substring(0, 100)}...` : 'No markdown plan');

      // Save the plan in the database (saveWeddingPlan now handles both insert and update)
      console.log('Saving wedding plan...');
      const saved = await saveWeddingPlan(user.id, weddingPlan, wizardData);
      if (!saved) throw new Error('Failed to save wedding plan');

      // Decrement revision count
      const updatedProfile = await updateUserPlanCount(user.id);
      setPlan(weddingPlan);
      setRevisionsLeft(updatedProfile.revisions_remaining);
      console.log('Wedding plan process completed successfully');
    } catch (err: any) {
      console.error('Error generating plan:', err);
      
      // More detailed error handling
      let errorMessage = 'An error occurred while generating your plan';
      
      if (err.message) {
        errorMessage = err.message;
      }
      
      // Check for specific error types
      if (err.message?.includes('SERPER_API_KEY')) {
        errorMessage = 'Search API configuration error. Please contact support.';
      } else if (err.message?.includes('Timeout')) {
        errorMessage = 'The research process timed out. Please try again with a more specific request.';
      } else if (err.message?.includes('rate limit')) {
        errorMessage = 'We\'ve reached our API rate limit. Please try again in a few minutes.';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      // Reset progress state after a delay to ensure smooth transition
      setTimeout(() => {
        setResearchProgress({ stage: '', percent: 0 });
      }, 500);
    }
  }

  // If user is not loaded or is null, return nothing
  if (!user) return null;

  return (
    <>
      {/* Fixed side nav */}
      <SideNav 
        user={user} 
        paymentConfirmed={paymentConfirmed} 
        onSignOut={() => {
          // Sign out the user
          supabase.auth.signOut().then(() => {
            // Redirect to home page after sign out
            router.push('/');
          });
        }} 
      />

      {/* Main content area, margin-left to accommodate side nav */}
      <div className="ml-64 min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
        {/* Minimal Header without sign out button */}
        <header className="border-b border-pink-100 bg-white/50 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-end">
            {/* Header content if needed */}
          </div>
        </header>

        {/* Subscription Banner (if not subscribed) */}
        {!paymentConfirmed && (
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="bg-gradient-to-r from-rose-50 to-purple-50 rounded-xl p-4 shadow-sm border border-rose-100 flex items-center justify-between relative overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute -left-4 -top-4 w-16 h-16 bg-rose-200 rounded-full opacity-20 -z-10"></div>
              <div className="absolute right-20 bottom-0 w-24 h-24 bg-purple-200 rounded-full opacity-20 -z-10"></div>

              <div className="relative">
                <h3 className="text-lg font-semibold text-gray-800">
                  Upgrade Your Wedding Planning Experience
                </h3>
                <p className="text-sm text-gray-600">
                  Get access to premium features and unlimited revisions
                </p>
              </div>
              <SubscriptionButton user={user} />
            </div>
          </div>
        )}

        {/* Main Section */}
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
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
              <span className="font-semibold text-purple-600">
                {revisionsLeft} of 2
              </span>
            </p>
          </div>

          {/* If user has no plan, show wizard; else show plan */}
          <div className="bg-white rounded-2xl shadow-sm border border-pink-100 p-8">
            {!plan ? (
              isLoading ? (
                // Research progress indicator
                <div className="flex flex-col items-center justify-center py-10 space-y-6">
                  <div className="w-full max-w-md bg-white rounded-lg shadow-sm border border-pink-100 p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      {researchProgress.stage || 'Researching your perfect wedding...'}  
                    </h3>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                      <div 
                        className="bg-gradient-to-r from-pink-400 to-purple-500 h-2.5 rounded-full transition-all duration-500 ease-in-out" 
                        style={{ width: `${researchProgress.percent}%` }}
                      ></div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-6">
                      Our AI is searching for venues, vendors, and ideas tailored to your preferences.
                      This may take a few minutes as we gather detailed information.
                    </p>
                    
                    <div className="flex items-center justify-center">
                      <div className="animate-pulse flex space-x-4 items-center">
                        <div className="h-3 w-3 bg-pink-400 rounded-full"></div>
                        <div className="h-3 w-3 bg-pink-500 rounded-full"></div>
                        <div className="h-3 w-3 bg-pink-600 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-500 italic">
                    We're using real-time data to create the most up-to-date plan for you.
                  </div>
                </div>
              ) : (
                // Multi-step wizard with proper props
                <PlanWizard 
                  onSubmit={handleWizardFinalSubmit}
                  initialData={formData}
                  isLoading={isLoading}
                />
              )
            ) : (
              // Show existing plan
              <div className="space-y-6">
                <div className="prose prose-pink max-w-none">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                    Your Wedding Plan
                  </h2>
                  
                  {/* Display the entire wedding plan as formatted markdown */}
                  <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                    {plan.markdownPlan ? (
                      <div className="text-gray-700 markdown-content">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-pink-700 mb-4" {...props} />,
                            h2: ({node, ...props}) => <h2 className="text-xl font-semibold text-pink-600 mt-6 mb-3" {...props} />,
                            h3: ({node, ...props}) => <h3 className="text-lg font-medium text-pink-500 mt-4 mb-2" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc pl-5 my-3" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal pl-5 my-3" {...props} />,
                            li: ({node, ...props}) => <li className="my-1" {...props} />,
                            p: ({node, ...props}) => <p className="my-2" {...props} />,
                            table: ({node, ...props}) => <div className="overflow-x-auto my-4"><table className="min-w-full divide-y divide-gray-200" {...props} /></div>,
                            thead: ({node, ...props}) => <thead className="bg-gray-50" {...props} />,
                            th: ({node, ...props}) => <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" {...props} />,
                            td: ({node, ...props}) => <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500" {...props} />,
                          }}
                      >
                        {plan.markdownPlan}
                      </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="text-gray-700 markdown-content">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-pink-700 mb-4" {...props} />,
                            h2: ({node, ...props}) => <h2 className="text-xl font-semibold text-pink-600 mt-6 mb-3" {...props} />,
                            h3: ({node, ...props}) => <h3 className="text-lg font-medium text-pink-500 mt-4 mb-2" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc pl-5 my-3" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal pl-5 my-3" {...props} />,
                            li: ({node, ...props}) => <li className="my-1" {...props} />,
                            p: ({node, ...props}) => <p className="my-2" {...props} />,
                            table: ({node, ...props}) => <div className="overflow-x-auto my-4"><table className="min-w-full divide-y divide-gray-200" {...props} /></div>,
                            thead: ({node, ...props}) => <thead className="bg-gray-50" {...props} />,
                            th: ({node, ...props}) => <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" {...props} />,
                            td: ({node, ...props}) => <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500" {...props} />,
                          }}
                        >
                          {`# ${plan.initial_preferences?.weddingStyle || 'Custom'} Wedding Plan for ${plan.initial_preferences?.location || 'Your Location'}

## Venue Recommendations
${plan.venue || 'Venue information not available'}

## Budget Breakdown
${plan.budget || 'Budget information not available'}

## Wedding Day Timeline
${plan.timeline || 'Timeline information not available'}

## Vendor Recommendations
${plan.vendors || 'Vendor information not available'}

## Decor & Theme
${plan.decor || 'Decor information not available'}

## Additional Recommendations
${plan.recommendations || 'No additional recommendations'}`}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
                {revisionsLeft > 0 && (
                  <button
                    onClick={() => setPlan(null)}
                    className="
                      w-full
                      rounded-lg
                      border
                      border-pink-200
                      bg-white
                      px-6 py-3
                      text-pink-600
                      font-medium
                      hover:bg-pink-50
                      focus:outline-none
                      focus:ring-2
                      focus:ring-pink-500
                      focus:ring-offset-2
                      transition-all
                      duration-200
                    "
                  >
                    Request a Revision
                  </button>
                )}
                <button
                  onClick={() => console.log('Download plan')}
                  className="
                    w-full
                    rounded-lg
                    border
                    border-purple-200
                    bg-white
                    px-6 py-3
                    text-purple-600
                    font-medium
                    hover:bg-purple-50
                    focus:outline-none
                    focus:ring-2
                    focus:ring-purple-500
                    focus:ring-offset-2
                    transition-all
                    duration-200
                  "
                >
                  Download Plan
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
