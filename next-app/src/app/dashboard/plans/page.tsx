'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabaseClient';
import type { WeddingPlan } from '@/types/plan';

// Some icons from react-icons or emojis in plain text
import { GiDiamondRing } from 'react-icons/gi';
import { FaMapMarkerAlt, FaMoneyBillWave } from 'react-icons/fa';
import { BsCheckCircleFill } from 'react-icons/bs';

export default function PlansPage() {
  const [plans, setPlans] = useState<WeddingPlan[]>([]);
  const [error, setError] = useState<string | null>(null);

  // For a success message if the user just saved a plan
  const searchParams = useSearchParams();
  const successParam = searchParams.get('success');

  const router = useRouter();

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        // Get current user session
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
          router.push('/login');
          return;
        }

        // Fetch all wedding plans for this user
        // If your DB only allows 1 plan per user, you could do .maybeSingle()
        const { data, error: fetchError } = await supabase
          .from('wedding_plans')
          .select('*')
          .eq('user_id', currentUser.id);

        if (fetchError) {
          console.error('Error fetching plans:', fetchError);
          setError(fetchError.message);
          return;
        }

        if (!data) {
          setPlans([]);
          return;
        }

        // If multiple plans are allowed, data is an array
        setPlans(data as WeddingPlan[]);
      } catch (err: any) {
        console.error('Error in fetchPlans:', err);
        setError(err.message);
      }
    };

    fetchPlans();
  }, [router]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-6">
      {/* If success=1 in the query, show a success message */}
      {successParam === '1' && (
        <div className="flex items-center gap-2 mb-4 bg-green-50 border-l-4 border-green-400 p-4 rounded-md">
          <BsCheckCircleFill color="#059669" size={20} />
          <span className="text-sm text-green-700">
            Plan has been saved successfully!
          </span>
        </div>
      )}

      <h1 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <GiDiamondRing color="#ec4899" />
        My Wedding Plans
      </h1>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {plans.length === 0 ? (
        <p className="text-gray-600">
          No wedding plans found. Generate a new plan in the dashboard!
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white p-4 rounded-md shadow-sm border">
              <div className="flex items-center gap-2">
                <GiDiamondRing color="#ec4899" size={24} />
                <h2 className="font-bold text-gray-800">
                  Plan <span className="text-xs text-gray-500">({plan.id})</span>
                </h2>
              </div>
              {/* If your "plan" is stored in plan.current_plan or plan.initial_preferences */}
              <div className="mt-2 text-sm text-gray-700 space-y-1">
                <p>
                  <span className="inline-block mr-1"><FaMoneyBillWave color="#10b981" /></span>
                  <strong>Budget:</strong>{' '}
                  {plan.initial_preferences?.budget || 'N/A'}
                </p>
                <p>
                  <span className="inline-block mr-1"><FaMapMarkerAlt color="#a855f7" /></span>
                  <strong>Location:</strong>{' '}
                  {plan.initial_preferences?.location || 'N/A'}
                </p>
                {/* Show other fields from plan.initial_preferences or plan.current_plan */}
                {/* e.g. plan.initial_preferences?.preferences */}
              </div>
              {/* If you want to show "generated plan" details from plan.current_plan, parse or display them here */}
              {/* For example: plan.current_plan.markdownPlan if it was saved as markdownPlan */}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
