import React from "react";
import styles from "./Skeleton.module.scss";

const Skeleton = ({
  width = "100%",
  height = "1rem",
  circle = false,
  borderRadius = "4px",
  className = "",
  style = {},
}) => {
  const skeletonClasses = [
    styles.skeleton,
    circle ? styles.circle : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

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
      <div className={styles.shimmer} />
    </div>
  );
};

export default Skeleton;
