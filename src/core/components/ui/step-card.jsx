import React from "react";

const StepCard = ({ children, className = "" }) => {
  return (
    <div
      className={`bg-card rounded-xl shadow-lg border p-8 mb-8 min-h-[600px] ${className}`}
    >
      <div className="animate-fadeIn">{children}</div>
    </div>
  );
};

export default StepCard;
