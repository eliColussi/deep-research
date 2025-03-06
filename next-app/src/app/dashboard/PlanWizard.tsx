'use client';

import React, { useState } from 'react';

// Types for your plan data
interface PlanFormData {
  budget: string;
  guestCount: number;
  location: string;
  dateRange: string;
  season: string;
  weddingStyle: string;
  colorPalette: string;
  preferences: string;
}

export default function MultiStepWeddingForm() {
  // 1. State for the current step (0-based)
  const [currentStep, setCurrentStep] = useState(0);

  // 2. State for form data
  const [formData, setFormData] = useState<PlanFormData>({
    budget: '',
    guestCount: 0,
    location: '',
    dateRange: '',
    season: '',
    weddingStyle: '',
    colorPalette: '',
    preferences: '',
  });

  // 3. Steps array for easy iteration
  const steps = [
    'Budget & Guests',
    'Location & Dates',
    'Theme & Style',
    'Preferences',
    'Review & Submit',
  ];

  // 4. Helper to move to next step
  function nextStep() {
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  }
  // Helper to move to previous step
  function prevStep() {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }

  // 5. Final submission
  async function handleFinalSubmit(e: React.FormEvent) {
    e.preventDefault();

    // You can integrate your existing wedding plan logic here:
    // e.g., generateWeddingPlan(formData)
    // or handleSubmit to your backend

    alert('Submitted form: ' + JSON.stringify(formData, null, 2));
  }

  // 6. Render each step
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((label, index) => {
          const active = index <= currentStep;
          return (
            <div key={label} className="flex items-center">
              <div
                className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium mr-2 ${
                  active
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {index + 1}
              </div>
              <span
                className={`text-sm font-semibold mr-4 ${
                  active ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={currentStep === steps.length - 1 ? handleFinalSubmit : (e) => e.preventDefault()}
        className="space-y-6 bg-white p-6 rounded-lg shadow"
      >
        {currentStep === 0 && (
          <StepBudgetGuests
            formData={formData}
            setFormData={setFormData}
          />
        )}

        {currentStep === 1 && (
          <StepLocationDates
            formData={formData}
            setFormData={setFormData}
          />
        )}

        {currentStep === 2 && (
          <StepThemeStyle
            formData={formData}
            setFormData={setFormData}
          />
        )}

        {currentStep === 3 && (
          <StepPreferences
            formData={formData}
            setFormData={setFormData}
          />
        )}

        {currentStep === 4 && (
          <StepReview formData={formData} />
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-4">
          {currentStep > 0 && (
            <button
              type="button"
              onClick={prevStep}
              className="px-5 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
            >
              Previous
            </button>
          )}
          {currentStep < steps.length - 1 && (
            <button
              type="button"
              onClick={nextStep}
              className="ml-auto px-5 py-2 bg-pink-500 text-white rounded hover:bg-pink-600 transition"
            >
              Next
            </button>
          )}
          {currentStep === steps.length - 1 && (
            <button
              type="submit"
              className="ml-auto px-5 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition"
            >
              Submit
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

// -------------- Step 1: Budget & Guests --------------
function StepBudgetGuests({
  formData,
  setFormData,
}: {
  formData: PlanFormData;
  setFormData: React.Dispatch<React.SetStateAction<PlanFormData>>;
}) {
  return (
    <div className="space-y-4">
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
              guestCount: parseInt(e.target.value, 10),
            }))
          }
          placeholder="E.g. 100"
        />
      </div>
    </div>
  );
}

// -------------- Step 2: Location & Dates --------------
function StepLocationDates({
  formData,
  setFormData,
}: {
  formData: PlanFormData;
  setFormData: React.Dispatch<React.SetStateAction<PlanFormData>>;
}) {
  return (
    <div className="space-y-4">
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
  );
}

// -------------- Step 3: Theme & Style --------------
function StepThemeStyle({
  formData,
  setFormData,
}: {
  formData: PlanFormData;
  setFormData: React.Dispatch<React.SetStateAction<PlanFormData>>;
}) {
  return (
    <div className="space-y-4">
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
  );
}

// -------------- Step 4: Additional Preferences --------------
function StepPreferences({
  formData,
  setFormData,
}: {
  formData: PlanFormData;
  setFormData: React.Dispatch<React.SetStateAction<PlanFormData>>;
}) {
  return (
    <div className="space-y-4">
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
    </div>
  );
}

// -------------- Step 5: Review & Submit --------------
function StepReview({ formData }: { formData: PlanFormData }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-700 mb-2">Review Your Details</h2>
      <div className="text-sm space-y-2">
        <p>
          <span className="font-medium">Budget:</span> {formData.budget}
        </p>
        <p>
          <span className="font-medium">Guest Count:</span> {formData.guestCount}
        </p>
        <p>
          <span className="font-medium">Location:</span> {formData.location}
        </p>
        <p>
          <span className="font-medium">Date Range:</span> {formData.dateRange}
        </p>
        <p>
          <span className="font-medium">Preferred Season:</span> {formData.season}
        </p>
        <p>
          <span className="font-medium">Wedding Style:</span> {formData.weddingStyle}
        </p>
        <p>
          <span className="font-medium">Color Palette:</span> {formData.colorPalette}
        </p>
        <p>
          <span className="font-medium">Additional Preferences:</span> {formData.preferences}
        </p>
      </div>
      <p className="text-gray-500 text-sm mt-4">
        If everything looks correct, click <strong>Submit</strong> to finish!
      </p>
    </div>
  );
}
