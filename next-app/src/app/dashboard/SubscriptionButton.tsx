// file: /components/SubscriptionButton.tsx
'use client';

import React, { useState } from 'react';
import PlanModal from './components/planModal'; // <-- import the new modal
import { plans } from '@/stripe/Pricing'; // for debugging if needed

console.log('Plans array in SubscriptionButton component:', plans);

export default function SubscriptionButton({ user }: { user: any }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="bg-rose-500 hover:bg-rose-900 text-white font-medium py-2 px-4 rounded-lg transition-colors"
      >
        Upgrade Plan
      </button>

      <PlanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={user}
      />
    </>
  );
}
