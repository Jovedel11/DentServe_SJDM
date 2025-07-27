import React from "react";
import styles from "./Loading.module.scss";

const Loading = ({
  type = "spinner",
  message = "Loading...",
  size = "medium",
  fullScreen = false,
}) => {
  const renderLoader = () => {
    switch (type) {
      case "skeleton":
        return <div className={styles.skeleton} />;
      case "dots":
        return (
          <div className={styles.dots}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        );
      default:
        return <div className={`${styles.spinner} ${styles[size]}`} />;
    }
  };

  if (fullScreen) {
    return (
      <div className={styles.fullScreenLoader}>
        <div className={styles.content}>
          {renderLoader()}
          <p className={styles.message}>{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.loading}>
      {renderLoader()}
      {message && <p className={styles.message}>{message}</p>}
    </div>
  );
};

export default Loading;
