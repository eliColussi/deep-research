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

// Design system colors - Futuristic wedding palette
const colors = {
  primary: 'from-rose-400 to-pink-600', // Gradient for primary elements
  secondary: 'from-purple-400 to-indigo-500', // Gradient for secondary elements
  accent: 'text-amber-500', // Accent color for highlights
  background: 'bg-gradient-to-br from-rose-50 to-indigo-50', // Subtle background gradient
  card: 'bg-white/80', // Semi-transparent card background
  text: {
    primary: 'text-gray-800',
    secondary: 'text-gray-600',
    muted: 'text-gray-400',
  },
  border: 'border-rose-100',
};

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
        bg-white/90
        backdrop-blur-md
        shadow-xl
        border-r border-rose-100
        p-6
        flex
        flex-col
        justify-between
        z-50
      "
    >
      <div>
        {/* Brand with gradient text */}
        <h1 className="text-2xl font-extrabold mb-8 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-pink-600">
          Wedding Planner AI
        </h1>

        

        {/* “Dashboard 12” item */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-base font-semibold text-gray-800">Dashboard</span>
          <span className="text-xs bg-red-500 text-white rounded-full px-2 py-0.5 shadow-sm">
            12
          </span>
        </div>

        {/* AI Assistant ✨ button with glassmorphism effect */}
        <div className="bg-gradient-to-r from-rose-400 to-purple-500 p-[1px] rounded-lg shadow-lg overflow-hidden">
          <button
            className="
              w-full
              rounded-md
              bg-white/90
              backdrop-blur-sm
              py-3
              px-4
              text-sm
              font-medium
              text-transparent
              bg-clip-text
              bg-gradient-to-r
              from-rose-500
              to-purple-600
              hover:bg-white/70
              transition-all
              duration-300
              flex
              items-center
              justify-center
              gap-2
            "
          >
            <span className="animate-pulse text-lg">✨</span>
            <span>AI Assistant</span>
            <span className="animate-pulse text-lg">✨</span>
          </button>
        </div>
      </div>

      {/* Sign Out Button */}
      <div className="mt-auto">
        <button
          onClick={onSignOut}
          className="w-full py-2 px-4 mb-6 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all duration-300 hover:shadow-md"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
        
        {/* Bottom Section: user info with glassmorphism effect */}
        <div className="flex items-center gap-3 p-3 bg-white/60 backdrop-blur-sm rounded-lg border border-rose-100">
          {/* User avatar with gradient border */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-rose-400 to-pink-600 flex items-center justify-center text-white font-bold">
            {user?.user_metadata?.name?.[0] || user?.email?.[0] || 'U'}
          </div>
          
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
      <div className={`ml-64 min-h-screen ${colors.background} font-sans`}>
        {/* Minimal Header without sign out button */}
        <header className={`border-b ${colors.border} bg-white/50 backdrop-blur-sm sticky top-0 z-10`}>
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-pink-600">Wedding Planner</h2>
            <div className="flex items-center space-x-3">
              {/* User settings button */}
              <button className="p-2 rounded-full hover:bg-white/70 transition-all duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
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

          {/* Revisions Counter with glassmorphism effect */}
          <div className="bg-white/60 backdrop-blur-sm rounded-full px-5 py-2.5 inline-flex items-center shadow-sm border border-rose-100 hover:shadow-md transition-all duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-rose-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            <p className="text-sm">
              <span className="text-gray-600">Revisions remaining: </span>
              <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-purple-600">
                {revisionsLeft} of 2
              </span>
            </p>
          </div>

          {/* If user has no plan, show wizard; else show plan */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-rose-100 p-8 hover:shadow-md transition-all duration-300">
            {!plan ? (
              isLoading ? (
                // Enhanced futuristic research progress indicator
                <div className="flex flex-col items-center justify-center py-10 space-y-6">
                  <div className="w-full max-w-md bg-white/90 backdrop-blur-sm rounded-lg shadow-md border border-rose-100 p-6 relative overflow-hidden">
                    {/* Decorative elements */}
                    <div className="absolute -right-12 -bottom-8 w-32 h-32 bg-gradient-to-br from-rose-100 to-purple-100 rounded-full opacity-50"></div>
                    <div className="absolute left-12 -top-6 w-16 h-16 bg-gradient-to-br from-amber-100 to-rose-100 rounded-full opacity-50"></div>
                    
                    <h3 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-purple-600 mb-4 relative">
                      {researchProgress.stage || 'Researching your perfect wedding...'}  
                    </h3>
                    
                    <div className="w-full bg-gray-100 rounded-full h-3 mb-4 overflow-hidden relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-rose-200 to-purple-200 opacity-30"></div>
                      <div 
                        className="bg-gradient-to-r from-rose-400 to-purple-500 h-3 rounded-full transition-all duration-500 ease-in-out relative z-10 flex items-center justify-end" 
                        style={{ width: `${researchProgress.percent}%` }}
                      >
                        {researchProgress.percent > 15 && (
                          <span className="h-2 w-2 bg-white rounded-full mr-0.5 animate-pulse"></span>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-6 relative">
                      Our AI is searching for venues, vendors, and ideas tailored to your preferences.
                      This may take a few minutes as we gather detailed information.
                    </p>
                    
                    <div className="flex items-center justify-center relative">
                      <div className="flex space-x-3 items-center">
                        <div className="h-2 w-2 bg-rose-400 rounded-full animate-ping"></div>
                        <div className="h-2 w-2 bg-pink-500 rounded-full animate-ping" style={{ animationDelay: '0.3s' }}></div>
                        <div className="h-2 w-2 bg-purple-500 rounded-full animate-ping" style={{ animationDelay: '0.6s' }}></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-500 italic flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-rose-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
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
              // Show existing plan with enhanced futuristic design
              <div className="space-y-6">
                <div className="prose prose-pink max-w-none">
                  <h2 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-purple-600 mb-6 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-rose-400" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                    </svg>
                    Your Wedding Plan
                  </h2>
                  
                  {/* Display the entire wedding plan as formatted markdown with glassmorphism */}
                  <div className="bg-white/90 backdrop-blur-sm rounded-lg p-8 shadow-md border border-rose-100 relative overflow-hidden">
                    {/* Decorative elements */}
                    <div className="absolute -right-16 -top-16 w-48 h-48 bg-gradient-to-br from-rose-100 to-purple-100 rounded-full opacity-30"></div>
                    <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-gradient-to-tr from-amber-100 to-rose-100 rounded-full opacity-30"></div>
                    <div className="relative z-10">
                    {plan?.markdownPlan ? (
                      <div className="text-gray-700 markdown-content">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-purple-600 mb-6" {...props} />,
                            h2: ({node, ...props}) => <h2 className="text-xl font-semibold text-rose-600 mt-8 mb-4 pb-2 border-b border-rose-100" {...props} />,
                            h3: ({node, ...props}) => <h3 className="text-lg font-medium text-rose-500 mt-6 mb-3" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc pl-5 my-4 space-y-2" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal pl-5 my-4 space-y-2" {...props} />,
                            li: ({node, ...props}) => <li className="my-1" {...props} />,
                            p: ({node, ...props}) => <p className="my-3 text-gray-600" {...props} />,
                            table: ({node, ...props}) => <div className="overflow-x-auto my-6 rounded-lg border border-rose-100 shadow-sm"><table className="min-w-full divide-y divide-rose-100" {...props} /></div>,
                            thead: ({node, ...props}) => <thead className="bg-rose-50" {...props} />,
                            th: ({node, ...props}) => <th className="px-4 py-3 text-left text-xs font-medium text-rose-600 uppercase tracking-wider" {...props} />,
                            td: ({node, ...props}) => <td className="px-4 py-3 text-sm text-gray-600 border-t border-rose-50" {...props} />,
                            a: ({node, ...props}) => <a className="text-rose-500 hover:text-rose-700 underline transition-colors duration-200" {...props} />,
                            blockquote: ({node, ...props}) => <blockquote className="pl-4 border-l-4 border-rose-200 italic text-gray-600 my-4" {...props} />,
                            code: ({node, ...props}) => <code className="bg-gray-50 text-rose-600 px-1 py-0.5 rounded text-sm" {...props} />,
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
                            h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-purple-600 mb-6" {...props} />,
                            h2: ({node, ...props}) => <h2 className="text-xl font-semibold text-rose-600 mt-8 mb-4 pb-2 border-b border-rose-100" {...props} />,
                            h3: ({node, ...props}) => <h3 className="text-lg font-medium text-rose-500 mt-6 mb-3" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc pl-5 my-4 space-y-2" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal pl-5 my-4 space-y-2" {...props} />,
                            li: ({node, ...props}) => <li className="my-1" {...props} />,
                            p: ({node, ...props}) => <p className="my-3 text-gray-600" {...props} />,
                            table: ({node, ...props}) => <div className="overflow-x-auto my-6 rounded-lg border border-rose-100 shadow-sm"><table className="min-w-full divide-y divide-rose-100" {...props} /></div>,
                            thead: ({node, ...props}) => <thead className="bg-rose-50" {...props} />,
                            th: ({node, ...props}) => <th className="px-4 py-3 text-left text-xs font-medium text-rose-600 uppercase tracking-wider" {...props} />,
                            td: ({node, ...props}) => <td className="px-4 py-3 text-sm text-gray-600 border-t border-rose-50" {...props} />,
                            a: ({node, ...props}) => <a className="text-rose-500 hover:text-rose-700 underline transition-colors duration-200" {...props} />,
                            blockquote: ({node, ...props}) => <blockquote className="pl-4 border-l-4 border-rose-200 italic text-gray-600 my-4" {...props} />,
                            code: ({node, ...props}) => <code className="bg-gray-50 text-rose-600 px-1 py-0.5 rounded text-sm" {...props} />,
                          }}
                        >
                          {`# ${plan?.initial_preferences?.weddingStyle || 'Custom'} Wedding Plan for ${plan?.initial_preferences?.location || 'Your Location'}

## Venue Recommendations
${plan?.venue || 'Venue information not available'}

## Budget Breakdown
${plan?.budget || 'Budget information not available'}

## Wedding Day Timeline
${plan?.timeline || 'Timeline information not available'}

## Vendor Recommendations
${plan?.vendors || 'Vendor information not available'}

## Decor & Theme
${plan?.decor || 'Decor information not available'}

## Additional Recommendations
${plan?.recommendations || 'No additional recommendations'}`}
                        </ReactMarkdown>
                      </div>
                    )}
                    </div>
                  </div>
                </div>
                {revisionsLeft > 0 && (
                  <button
                    onClick={() => setPlan(null)}
                    className="
                      w-full
                      rounded-lg
                      border
                      border-rose-200
                      bg-white/90
                      backdrop-blur-sm
                      px-6 py-3
                      text-transparent
                      bg-clip-text
                      bg-gradient-to-r
                      from-rose-500
                      to-purple-600
                      font-medium
                      hover:bg-rose-50
                      hover:shadow-md
                      focus:outline-none
                      focus:ring-2
                      focus:ring-rose-500
                      focus:ring-offset-2
                      transition-all
                      duration-300
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
