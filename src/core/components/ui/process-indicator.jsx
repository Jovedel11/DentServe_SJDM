import React from "react";
import { Check } from "lucide-react";

const ProgressIndicator = ({
  currentStep,
  totalSteps,
  progress,
  steps = ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"],
}) => {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-foreground">
          Step {currentStep + 1} of {totalSteps}
        </span>
        <span className="text-sm text-muted-foreground">
          {Math.round(progress)}% Complete
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-muted rounded-full h-2 mb-6">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step Breadcrumbs */}
      <div className="flex items-center justify-center">
        {steps.slice(0, totalSteps).map((step, index) => (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium transition-all duration-300 ${
                  index < currentStep
                    ? "bg-success text-white shadow-md"
                    : index === currentStep
                    ? "bg-primary text-primary-foreground shadow-md scale-110"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {index < currentStep ? (
                  <Check className="w-5 h-5" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={`mt-2 text-xs font-medium ${
                  index <= currentStep
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {step}
              </span>
            </div>
            {index < steps.slice(0, totalSteps).length - 1 && (
              <div
                className={`w-16 h-1 mx-3 mt-[-20px] transition-all duration-500 ${
                  index < currentStep ? "bg-success" : "bg-muted"
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default ProgressIndicator;
