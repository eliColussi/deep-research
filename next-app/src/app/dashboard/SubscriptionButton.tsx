'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { plans, handleCheckout } from '@/stripe/Pricing';

// Debug the plans array
console.log('Plans array in SubscriptionButton component:', plans);

// Subscription Button Component
export default function SubscriptionButton({ user }: { user: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  // Set up portal container on client side
  useEffect(() => {
    const container = document.createElement('div');
    container.id = 'subscription-dropdown-portal';
    document.body.appendChild(container);
    setPortalContainer(container);

    return () => {
      document.body.removeChild(container);
    };
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Update dropdown position when button is clicked
  const updateDropdownPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      });
    }
  };

  // Toggle dropdown and update position
  const toggleDropdown = () => {
    if (!isOpen) {
      updateDropdownPosition();
    }
    setIsOpen(!isOpen);
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggleDropdown}
        className="bg-rose-500 hover:bg-rose-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
      >
        Upgrade Plan
      </button>

      {isOpen && portalContainer && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 w-80"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
          }}
        >
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Choose a Plan</h3>
            <p className="text-sm text-gray-500">Select the plan that works best for you</p>
          </div>
          <div className="p-4 space-y-3">
            {/* Monthly Plan */}
            <button
              onClick={() => {
                handleCheckout('monthly', user?.email);
                setIsOpen(false);
              }}
              className="block w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="flex justify-between items-center">
                <div>
                  <span className="block font-medium text-gray-900">Monthly Plan</span>
                </div>
                <span className="text-rose-500 text-sm font-medium">Select →</span>
              </div>
            </button>
            
            {/* Yearly Plan */}
            <button
              onClick={() => {
                handleCheckout('yearly', user?.email);
                setIsOpen(false);
              }}
              className="block w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors border-l-2 border-rose-500"
            >
              <div className="flex justify-between items-center">
                <div>
                  <span className="block font-medium text-gray-900">Yearly Plan</span>
                  <span className="text-sm text-gray-500">Save 30%</span>
                </div>
                <span className="text-rose-500 text-sm font-medium">Select →</span>
              </div>
            </button>
          </div>
        </div>,
        portalContainer
      )}
    </>
  );
}
