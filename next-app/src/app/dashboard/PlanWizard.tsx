'use client';

import React, { useState } from 'react';
import {
  Box,
  Button,
  Stepper,
  Step,
  StepLabel,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
} from '@mui/material';

// Types for your plan data
export interface PlanFormData {
  budget: string;
  guestCount: number;
  location: string;
  dateRange: string;
  season: string;
  weddingStyle: string;
  colorPalette: string;
  preferences: string;
}

const steps = [
  'Budget & Guests',
  'Location & Dates',
  'Theme & Style',
  'Preferences',
  'Review & Submit',
];

interface MultiStepWeddingFormProps {
  onSubmit: (formData: PlanFormData) => Promise<void>;
  initialData?: Partial<PlanFormData>;
  isLoading?: boolean;
}

export default function MultiStepWeddingForm({
  onSubmit,
  initialData = {},
  isLoading = false,
}: MultiStepWeddingFormProps) {
  // 1. State for the current step (0-based)
  const [currentStep, setCurrentStep] = useState(0);

  // 2. State for form data with initialData merged
  const [formData, setFormData] = useState<PlanFormData>({
    budget: initialData.budget || '',
    guestCount: initialData.guestCount || 0,
    location: initialData.location || '',
    dateRange: initialData.dateRange || '',
    season: initialData.season || '',
    weddingStyle: initialData.weddingStyle || '',
    colorPalette: initialData.colorPalette || '',
    preferences: initialData.preferences || '',
  });

  // 3. Move to next step
  function nextStep() {
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  }
  // Move to previous step
  function prevStep() {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }

  // 4. Final submission
  async function handleFinalSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Call the parent component's onSubmit function with the form data
    await onSubmit(formData);
  }

  // 5. Helper to render each step’s content
  function renderStepContent(stepIndex: number) {
    switch (stepIndex) {
      case 0:
        return (
          <StepBudgetGuests formData={formData} setFormData={setFormData} />
        );
      case 1:
        return (
          <StepLocationDates formData={formData} setFormData={setFormData} />
        );
      case 2:
        return (
          <StepThemeStyle formData={formData} setFormData={setFormData} />
        );
      case 3:
        return (
          <StepPreferences formData={formData} setFormData={setFormData} />
        );
      case 4:
        return <StepReview formData={formData} />;
      default:
        return <div>Unknown Step</div>;
    }
  }

  return (
    <Box maxWidth="600px" mx="auto" py={4} px={2}>
      {/* Enhanced MUI Stepper with custom styling */}
      <Stepper 
        activeStep={currentStep} 
        alternativeLabel 
        sx={{ 
          mb: 4,
          '& .MuiStepLabel-root .Mui-active': {
            color: '#ec4899', // rose-500
          },
          '& .MuiStepLabel-root .Mui-completed': {
            color: '#ec4899', // rose-500
          },
          '& .MuiStepConnector-line': {
            borderColor: '#fce7f3', // rose-100
          },
          '& .MuiStepConnector-root.Mui-active .MuiStepConnector-line': {
            borderColor: '#ec4899', // rose-500
          },
          '& .MuiStepConnector-root.Mui-completed .MuiStepConnector-line': {
            borderColor: '#ec4899', // rose-500
          },
        }}
      >
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* The main form container with glassmorphism effect */}
      <Paper
        component="form"
        onSubmit={
          currentStep === steps.length - 1
            ? handleFinalSubmit
            : (e) => e.preventDefault()
        }
        elevation={0}
        sx={{ 
          p: 4, 
          borderRadius: 3,
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(236, 72, 153, 0.1)', // rose-500 with opacity
          boxShadow: '0 4px 20px rgba(236, 72, 153, 0.1)', // rose shadow
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '150px',
            height: '150px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(252, 231, 243, 0.5), rgba(249, 168, 212, 0.2))', // rose gradients
            zIndex: 0,
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: '-30px',
            left: '-30px',
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(254, 242, 242, 0.5), rgba(252, 165, 165, 0.2))', // rose gradients
            zIndex: 0,
          },
        }}
      >
        {/* Step-specific content with relative positioning for z-index */}
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          {renderStepContent(currentStep)}
        </Box>

        {/* Enhanced Navigation Buttons */}
        <Box display="flex" justifyContent="space-between" mt={4} sx={{ position: 'relative', zIndex: 1 }}>
          {currentStep > 0 && (
            <Button
              variant="outlined"
              onClick={prevStep}
              sx={{ 
                mr: 'auto',
                borderColor: 'rgba(236, 72, 153, 0.5)',
                color: 'rgb(219, 39, 119)',
                '&:hover': {
                  borderColor: 'rgb(219, 39, 119)',
                  backgroundColor: 'rgba(252, 231, 243, 0.1)',
                },
                px: 3,
                py: 1,
                borderRadius: 2,
                transition: 'all 0.3s ease',
              }}
            >
              Previous
            </Button>
          )}
          {currentStep < steps.length - 1 && (
            <Button
              variant="contained"
              onClick={nextStep}
              sx={{ 
                ml: 'auto',
                background: 'linear-gradient(90deg, rgb(236, 72, 153), rgb(217, 70, 239))',
                color: 'white',
                '&:hover': {
                  background: 'linear-gradient(90deg, rgb(219, 39, 119), rgb(192, 38, 211))',
                  boxShadow: '0 4px 12px rgba(236, 72, 153, 0.3)',
                  transform: 'translateY(-2px)',
                },
                px: 3,
                py: 1,
                borderRadius: 2,
                boxShadow: '0 4px 10px rgba(236, 72, 153, 0.2)',
                transition: 'all 0.3s ease',
              }}
            >
              Next
            </Button>
          )}
          {currentStep === steps.length - 1 && (
            <Button
              type="submit"
              variant="contained"
              sx={{ 
                ml: 'auto',
                position: 'relative',
                minWidth: '180px',
                background: 'linear-gradient(90deg, rgb(236, 72, 153), rgb(217, 70, 239))',
                color: 'white',
                '&:hover': {
                  background: 'linear-gradient(90deg, rgb(219, 39, 119), rgb(192, 38, 211))',
                  boxShadow: '0 4px 12px rgba(236, 72, 153, 0.3)',
                  transform: 'translateY(-2px)',
                },
                px: 3,
                py: 1.5,
                borderRadius: 2,
                boxShadow: '0 4px 10px rgba(236, 72, 153, 0.2)',
                transition: 'all 0.3s ease',
                '&.Mui-disabled': {
                  background: 'linear-gradient(90deg, rgba(236, 72, 153, 0.7), rgba(217, 70, 239, 0.7))',
                  color: 'rgba(255, 255, 255, 0.8)',
                }
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Box 
                    component="span" 
                    sx={{ 
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 1.5
                    }}
                  >
                    <Box 
                      component="span" 
                      sx={{ 
                        width: '18px',
                        height: '18px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderRadius: '50%',
                        borderTopColor: 'white',
                        animation: 'spin 1s linear infinite',
                        '@keyframes spin': {
                          '0%': { transform: 'rotate(0deg)' },
                          '100%': { transform: 'rotate(360deg)' }
                        },
                        boxShadow: '0 0 10px rgba(255, 255, 255, 0.5)'
                      }}
                    />
                    <span>Researching your perfect wedding...</span>
                  </Box>
                </>
              ) : (
                <>
                  <Box 
                    component="span" 
                    sx={{ 
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 1
                    }}
                  >
                    <span>Generate Wedding Plan</span>
                    <span style={{ fontSize: '1.2em' }}>✨</span>
                  </Box>
                </>
              )}
            </Button>
          )}
        </Box>
      </Paper>
    </Box>
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
    <Box display="flex" flexDirection="column" gap={2}>
      <FormControl fullWidth>
        <InputLabel id="budget-label">Budget Range</InputLabel>
        <Select
          labelId="budget-label"
          label="Budget Range"
          value={formData.budget}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, budget: e.target.value }))
          }
        >
          <MenuItem value="">Select budget</MenuItem>
          <MenuItem value="10-20k">$10,000 - $20,000</MenuItem>
          <MenuItem value="20-30k">$20,000 - $30,000</MenuItem>
          <MenuItem value="30-50k">$30,000 - $50,000</MenuItem>
          <MenuItem value="50k+">$50,000+</MenuItem>
        </Select>
      </FormControl>

      <TextField
        fullWidth
        type="number"
        label="Guest Count"
        variant="outlined"
        value={formData.guestCount}
        onChange={(e) =>
          setFormData((prev) => ({
            ...prev,
            guestCount: parseInt(e.target.value, 10),
          }))
        }
        placeholder="E.g. 100"
      />
    </Box>
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
    <Box display="flex" flexDirection="column" gap={2}>
      <TextField
        fullWidth
        label="Location"
        variant="outlined"
        value={formData.location}
        onChange={(e) =>
          setFormData((prev) => ({ ...prev, location: e.target.value }))
        }
        placeholder="City, State or Country"
      />

      <TextField
        fullWidth
        label="Date Range"
        variant="outlined"
        value={formData.dateRange}
        onChange={(e) =>
          setFormData((prev) => ({ ...prev, dateRange: e.target.value }))
        }
        placeholder="e.g. June 2025 or a specific date"
      />
    </Box>
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
    <Box display="flex" flexDirection="column" gap={2}>
      <FormControl fullWidth>
        <InputLabel id="season-label">Preferred Season</InputLabel>
        <Select
          labelId="season-label"
          label="Preferred Season"
          value={formData.season}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, season: e.target.value }))
          }
        >
          <MenuItem value="">Select season</MenuItem>
          <MenuItem value="spring">Spring</MenuItem>
          <MenuItem value="summer">Summer</MenuItem>
          <MenuItem value="fall">Fall</MenuItem>
          <MenuItem value="winter">Winter</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth>
        <InputLabel id="style-label">Wedding Style</InputLabel>
        <Select
          labelId="style-label"
          label="Wedding Style"
          value={formData.weddingStyle}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, weddingStyle: e.target.value }))
          }
        >
          <MenuItem value="">Select style</MenuItem>
          <MenuItem value="classic">Classic</MenuItem>
          <MenuItem value="boho">Boho</MenuItem>
          <MenuItem value="modern">Modern</MenuItem>
          <MenuItem value="rustic">Rustic</MenuItem>
        </Select>
      </FormControl>
    </Box>
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
    <Box display="flex" flexDirection="column" gap={2}>
      <FormControl fullWidth>
        <InputLabel id="palette-label">Color Palette</InputLabel>
        <Select
          labelId="palette-label"
          label="Color Palette"
          value={formData.colorPalette}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, colorPalette: e.target.value }))
          }
        >
          <MenuItem value="">Select palette</MenuItem>
          <MenuItem value="pastel">Pastel</MenuItem>
          <MenuItem value="vibrant">Vibrant</MenuItem>
          <MenuItem value="neutral">Neutral</MenuItem>
          <MenuItem value="dark">Dark</MenuItem>
        </Select>
      </FormControl>

      <TextField
        fullWidth
        label="Additional Preferences"
        variant="outlined"
        multiline
        rows={4}
        value={formData.preferences}
        onChange={(e) =>
          setFormData((prev) => ({ ...prev, preferences: e.target.value }))
        }
        placeholder="Tell us about your dream wedding..."
      />
    </Box>
  );
}

// -------------- Step 5: Review & Submit --------------
function StepReview({ formData }: { formData: PlanFormData }) {
  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <Typography variant="h6" gutterBottom>
        Review Your Details
      </Typography>

      <Typography variant="body2">
        <strong>Budget:</strong> {formData.budget}
      </Typography>
      <Typography variant="body2">
        <strong>Guest Count:</strong> {formData.guestCount}
      </Typography>
      <Typography variant="body2">
        <strong>Location:</strong> {formData.location}
      </Typography>
      <Typography variant="body2">
        <strong>Date Range:</strong> {formData.dateRange}
      </Typography>
      <Typography variant="body2">
        <strong>Preferred Season:</strong> {formData.season}
      </Typography>
      <Typography variant="body2">
        <strong>Wedding Style:</strong> {formData.weddingStyle}
      </Typography>
      <Typography variant="body2">
        <strong>Color Palette:</strong> {formData.colorPalette}
      </Typography>
      <Typography variant="body2">
        <strong>Additional Preferences:</strong> {formData.preferences}
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        If everything looks correct, click <strong>Submit</strong> to finish!
      </Typography>
    </Box>
  );
}
