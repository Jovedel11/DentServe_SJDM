const Loader = ({ size = "medium", color, message }) => {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 p-8"
      role="status"
      aria-label="Loading"
    >
      <SpinnerLoader size={size} color={color} />
      {message && (
        <p className="text-center text-gray-700 dark:text-gray-200 font-medium max-w-[20ch] mt-0 text-base">
          {message}
        </p>
      )}
    </div>
  );
};

const SpinnerLoader = ({ size, color }) => {
  const sizeMap = {
    small: 40,
    medium: 60,
    large: 80,
  };

  const spinnerSize =
    typeof size === "number" ? size : sizeMap[size] || sizeMap.medium;

  return (
    <div
      className="relative animate-spin"
      style={{ width: spinnerSize, height: spinnerSize }}
    >
      <div
        className="absolute inset-0 rounded-full border-3 border-solid"
        style={{
          borderTopColor: color || "#38bdf8", // sky-400
          borderRightColor: "transparent",
          borderBottomColor: "transparent",
          borderLeftColor: "transparent",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center transform scale-70">
        <DentalIcon color={color} />
      </div>
    </div>
  );
};

const DentalIcon = ({ color = "#38bdf8" }) => (
  <svg className="w-full h-full" viewBox="0 0 64 64">
    <path d="M32 12 L42 8 L48 18 L38 22 Z" fill={color} opacity="0.8" />
    <circle cx="42" cy="15" r="3" fill="#94a3b8" />
    <path
      d="M26 30 Q30 22 34 30 Q38 40 30 44 Q22 40 26 30 Z"
      fill="#f0f9ff"
      stroke={color}
      strokeWidth="1.5"
    />
  </svg>
);

export default Loader;
