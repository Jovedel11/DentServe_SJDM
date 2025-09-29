import React from "react";

export const Checkbox = ({
  checked,
  onChange,
  label,
  disabled = false,
  className = "",
}) => {
  return (
    <label
      className={`flex items-center gap-2 cursor-pointer select-none ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${className}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        disabled={disabled}
        className="peer hidden"
      />

      {/* box */}
      <span
        className={`w-5 h-5 flex items-center justify-center border rounded 
          border-gray-400 peer-checked:bg-blue-500 peer-checked:border-blue-500`}
      >
        {checked && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-3 h-3 text-white"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414L8.707 14.707a1 1 0 01-1.414 0L3.293 10.707a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </span>

      {/* label */}
      {label && <span className="text-sm">{label}</span>}
    </label>
  );
};
