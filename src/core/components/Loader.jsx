import styles from "./Loader.module.scss";

const Loader = ({
  type = "spinner",
  size = "medium",
  color,
  message,
  count = 1,
  width,
  height,
}) => {
  if (type === "skeleton") {
    return <SkeletonLoader count={count} width={width} height={height} />;
  }

  return (
    <div className={styles.loaderContainer}>
      <SpinnerLoader size={size} color={color} />
      {message && <p className={styles.message}>{message}</p>}
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
      className={styles.spinner}
      style={{
        width: spinnerSize,
        height: spinnerSize,
        "--loader-color": color,
      }}
    >
      <div className={styles.spinnerInner}>
        <DentalIcon />
      </div>
    </div>
  );
};

const DentalIcon = () => (
  <svg className={styles.dentalIcon} viewBox="0 0 64 64">
    {/* dental drill icon */}
    <path d="M32 12 L42 8 L48 18 L38 22 Z" className={styles.drillBody} />
    <circle cx="42" cy="15" r="3" className={styles.drillBit} />
    {/* tooth icon */}
    <path
      d="M26 30 Q30 22 34 30 Q38 40 30 44 Q22 40 26 30 Z"
      className={styles.tooth}
    />
  </svg>
);

const SkeletonLoader = ({ count, width, height }) => {
  const skeletons = Array.from({ length: count }, (_, i) => (
    <div key={i} className={styles.skeleton} style={{ width, height }} />
  ));

  return <div className={styles.skeletonContainer}>{skeletons}</div>;
};

export default Loader;
