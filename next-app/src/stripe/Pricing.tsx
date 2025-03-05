'use client';

import React, { useState } from 'react';
import { useUser } from '@supabase/auth-helpers-react';
import { Switch, styled } from '@mui/material';

// Custom styled Material UI Switch to match the design exactly as in the image
const MaterialUISwitch = styled(Switch)(({ theme }) => ({
  width: 60,
  height: 30,
  padding: 0,
  '& .MuiSwitch-switchBase': {
    margin: 3,
    padding: 0,
    transform: 'translateX(0)',
    '&.Mui-checked': {
      color: '#fff',
      transform: 'translateX(30px)',
      '& + .MuiSwitch-track': {
        opacity: 1,
        backgroundColor: '#d1d5db',
        borderColor: '#d1d5db',
      },
    },
  },
  '& .MuiSwitch-thumb': {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    boxShadow: '0 2px 4px 0 rgba(0,0,0,0.1)',
  },
  '& .MuiSwitch-track': {
    opacity: 1,
    backgroundColor: '#d1d5db',
    borderRadius: 15,
    border: '1px solid #d1d5db',
  },
}));

export interface Plan {
  name: string;
  price: number;
  duration: string;
  description: string;
  features: string[];
  link: string;
  priceId: string;
  highlight?: boolean;
}

export const plans: Plan[] = [
  {
    name: 'Essential',
    price: 19,
    duration: '/month',
    description: 'Perfect for couples just starting their planning journey',
    features: [
      'AI Wedding Planning Assistant',
      'Basic Timeline Management',
      'Guest List Management',
      'Budget Tracking',
      'Vendor Directory Access',
    ],
    link:
      process.env.NODE_ENV === 'development'
        ? 'https://example-dev-monthly-link.com'
        : 'https://example-prod-monthly-link.com',
    priceId: 'dev_monthly_price_id',
  },
  {
    name: 'Premium',
    price: 99,
    duration: '/year',
    description: 'Comprehensive planning tools for your perfect day',
    features: [
      'Everything in Essential, plus:',
      'Advanced AI Planning Features',
      'Premium Vendor Recommendations',
      'Custom Website Builder',
      'Priority Support',
      'Unlimited Guest Management',
    ],
    link:
      process.env.NODE_ENV === 'development'
        ? 'https://example-dev-yearly-link.com'
        : 'https://example-prod-yearly-link.com',
    priceId: 'dev_yearly_price_id',
    highlight: true,
  },
];

const Pricing: React.FC = () => {
  const user = useUser();
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');

  // Choose the plan based on toggle state
  const selectedPlan = billingInterval === 'monthly' ? plans[0]! : plans[1]!;

  return (
    <section
      id="pricing"
      className="py-32 bg-gradient-to-br from-gray-50 to-gray-100"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center space-y-2 mb-16">
          <p className="text-rose-500 font-medium uppercase tracking-wide text-sm">
            PRICING
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Plans for every wedding journey 💍
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Choose the perfect plan to make your special day truly memorable
          </p>
        </div>

        {/* Pricing Toggle - Material UI */}
        <div className="flex flex-col items-center justify-center mt-16 mb-12">
          <div className="flex items-center justify-center gap-10">
            <span
              className={`font-bold text-lg cursor-pointer transition-colors ${
                billingInterval === 'yearly' ? 'text-gray-800' : 'text-gray-400'
              }`}
              onClick={() => setBillingInterval('yearly')}
              style={{ userSelect: 'none' }}
            >
              Annually
            </span>

            <div className="bg-gray-100 p-1 rounded-full flex items-center justify-center shadow-sm">
              <MaterialUISwitch
                checked={billingInterval === 'monthly'}
                onChange={() =>
                  setBillingInterval((prev) => (prev === 'monthly' ? 'yearly' : 'monthly'))
                }
                sx={{ m: 0 }}
              />
            </div>

            <span
              className={`font-bold text-lg cursor-pointer transition-colors ${
                billingInterval === 'monthly' ? 'text-gray-800' : 'text-gray-400'
              }`}
              onClick={() => setBillingInterval('monthly')}
              style={{ userSelect: 'none' }}
            >
              Monthly
            </span>
          </div>
        </div>

        {/* Single Pricing Card */}
        <div className="max-w-md mx-auto mb-16 mt-6">
          <div className="bg-white rounded-2xl overflow-hidden shadow-xl border border-gray-200">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {selectedPlan.name}
                  </h3>
                  <p className="text-gray-600 mt-1">{selectedPlan.description}</p>
                </div>
                {selectedPlan.highlight && (
                  <span className="bg-rose-100 text-rose-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    Popular
                  </span>
                )}
              </div>

              <div className="mb-6 flex items-baseline">
                <span className="text-5xl font-bold text-gray-900">
                  ${selectedPlan.price}
                </span>
                <span className="text-xl text-gray-500 ml-2 font-medium">
                  {selectedPlan.duration}
                </span>
              </div>

              <ul className="space-y-4">
                {selectedPlan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <svg
                      className="h-5 w-5 flex-shrink-0 text-green-500 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="ml-3 text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <a
                  href={`${selectedPlan.link}?prefilled_email=${user?.email || ''}`}
                  className="w-full flex items-center justify-center px-6 py-3 rounded-lg text-base font-medium text-white bg-rose-500 hover:bg-rose-600 transition-all duration-200"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get Started →
                </a>
                {!user && (
                  <p className="text-center text-sm text-gray-500 mt-2">
                    Please <span className="font-semibold">sign in</span> to continue
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Trust badge */}
        <div className="flex justify-center mt-8">
          <div className="flex items-center">
            <svg
              className="h-5 w-5 text-green-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="ml-2 text-sm text-gray-600">Secure checkout</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
