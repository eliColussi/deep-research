// file: /components/SubscriptionButton.tsx
'use client';

import React, { useState } from 'react';
import PlanModal from './components/planModal'; // <-- import the new modal
import { plans } from '@/stripe/Pricing'; // for debugging if needed

console.log('Plans array in SubscriptionButton component:', plans);

export default function SubscriptionButton({ 
  user, 
  planType, 
  revisionsLeft 
}: { 
  user: any;
  planType?: string | null;
  revisionsLeft?: number;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col space-y-2">
        {planType && (
          <div className="text-sm text-gray-600 mb-1">
            <span className="font-medium">Current Plan:</span> 
            <span className="ml-1 text-rose-600 font-semibold">
              {planType === 'annual' ? 'Annual Pro' : 'Monthly Pro'}
            </span>
          </div>
        )}
        
        {typeof revisionsLeft === 'number' && (
          <div className="text-sm text-gray-600 mb-2">
            <span className="font-medium">Credits Remaining:</span> 
            <span className="ml-1 font-semibold">{revisionsLeft}</span>
          </div>
        )}
        
        <button
          onClick={() => setIsModalOpen(true)}
          className={`${planType ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-rose-500 hover:bg-rose-600'} text-white font-medium py-2 px-4 rounded-lg transition-colors shadow-sm`}
        >
          {planType ? 'Manage Subscription' : 'Upgrade Plan'}
        </button>
      </div>

      <PlanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={user}
      />
    </>
  );
}
