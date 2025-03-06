// file: /components/PlanModal.tsx
'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useUser } from '@supabase/auth-helpers-react';
import { MaterialUISwitch, plans } from '@/stripe/Pricing'; 
import Link from 'next/link';

/**
 * PlanModal Props
 * - isOpen: whether the modal is visible
 * - onClose: function to close the modal
 */
interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PlanModal({ isOpen, onClose }: PlanModalProps) {
  // For toggling monthly/yearly
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const user = useUser();

  // Default fallback plan in case plans array is empty or undefined
  const fallbackPlan = {
    name: 'Premium Plan',
    price: 19,
    duration: '/month',
    description: 'Perfect for couples just starting their planning journey',
    features: ['AI Wedding Planning Assistant', 'Basic Timeline Management'],
    link: 'https://buy.stripe.com/test_8wM03y6H31IL6qIfZ1',
    priceId: 'price_default',
    highlight: false,
  };

  // If monthly => plans[0], if yearly => plans[1]
  const selectedPlan = billingInterval === 'monthly' ? plans[0] : plans[1];

  // Use selectedPlan if available, otherwise use fallbackPlan
  const plan = selectedPlan || fallbackPlan;

  // If modal not open, render nothing
  if (!isOpen) return null;

  // createPortal so the modal is at the top level
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      ></div>

      {/* Modal content */}
      <div className="relative z-10 bg-white w-full max-w-md mx-auto rounded-2xl shadow-lg border border-gray-200 p-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <span className="text-xl">&times;</span>
        </button>

        <div className="text-center space-y-2 mb-6">
          <p className="text-rose-500 font-medium uppercase tracking-wide text-sm">
            PRICING 💕
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            Plans for every wedding journey
          </h2>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            Choose the perfect plan to make your special day truly memorable
          </p>
        </div>

        {/* Toggle for monthly/yearly */}
        <div className="flex items-center justify-center gap-6 mb-8">
          <span
            className={`font-bold text-md cursor-pointer transition-colors ${
              billingInterval === 'yearly' ? 'text-gray-800' : 'text-gray-400'
            }`}
            onClick={() => setBillingInterval('yearly')}
          >
            Annually
          </span>
          <div className="bg-gray-100 p-1 rounded-full flex items-center justify-center shadow-sm">
            <MaterialUISwitch
              checked={billingInterval === 'monthly'}
              onChange={() =>
                setBillingInterval((prev) =>
                  prev === 'monthly' ? 'yearly' : 'monthly'
                )
              }
              sx={{ m: 0 }}
            />
          </div>
          <span
            className={`font-bold text-md cursor-pointer transition-colors ${
              billingInterval === 'monthly' ? 'text-gray-800' : 'text-gray-400'
            }`}
            onClick={() => setBillingInterval('monthly')}
          >
            Monthly
          </span>
        </div>

        {/* Pricing card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {plan.name}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {plan.description}
                </p>
              </div>
              {plan.highlight && (
                <span className="bg-rose-100 text-rose-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  Popular
                </span>
              )}
            </div>

            <div className="mb-4 flex items-baseline">
              <span className="text-4xl font-bold text-gray-900">
                ${plan.price}
              </span>
              <span className="text-md text-gray-500 ml-2 font-medium">
                {plan.duration}
              </span>
            </div>

            <ul className="space-y-2">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start text-sm">
                  <svg
                    className="h-4 w-4 flex-shrink-0 text-green-500 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="ml-2 text-gray-600">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6">
              {user ? (
                <a
                  href={`${plan.link}?prefilled_email=${user?.email || ''}`}
                  className="w-full flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 transition-all duration-200"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Upgrade Now →
                </a>
              ) : (
                <Link
                  href="/signup"
                  className="w-full flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 transition-all duration-200"
                >
                  Create Account →
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body // or any container
  );
}
