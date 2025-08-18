import React from "react";
const Skeleton = ({
  width = "100%",
  height = "1rem",
  circle = false,
  borderRadius = "4px",
  className = "",
  style = {},
}) => {
  const skeletonClasses = `
    relative overflow-hidden 
    bg-gray-300 
    ${circle ? "rounded-full" : "rounded"} 
    ${className}
  `;

  const skeletonStyle = {
    width,
    height: circle ? width : height,
    borderRadius: circle ? "50%" : borderRadius,
    ...style,
  };

  return (
    <div
      className={skeletonClasses}
      style={skeletonStyle}
      aria-label="Loading content"
      role="status"
    >
      <div
        className="
          absolute inset-0 w-full h-full
          bg-gradient-to-r from-transparent via-white/80 to-transparent
          animate-shimmer
        "
      />
    </div>
  );
};

export default Skeleton;
