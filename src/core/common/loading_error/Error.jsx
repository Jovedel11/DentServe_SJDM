import React from "react";
import styles from "./Error.module.scss";

const Error = ({
  type = "general",
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  onRetry,
  retryText = "Try Again",
  fullScreen = false,
  icon,
}) => {
  const getIcon = () => {
    if (icon) return icon;

    switch (type) {
      case "network":
        return (
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
            />
          </svg>
        );
      case "notFound":
        return (
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.034 0-3.9.785-5.291 2.063m6.291-6.234a9 9 0 11-6.291 0"
            />
          </svg>
        );
      default:
        return (
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
    }
  };

  if (fullScreen) {
    return (
      <div className={styles.fullScreenError}>
        <div className={styles.content}>
          <div className={styles.icon}>{getIcon()}</div>
          <h2>{title}</h2>
          <p>{message}</p>
          {onRetry && (
            <button onClick={onRetry} className={styles.retryButton}>
              {retryText}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.error}>
      <div className={styles.icon}>{getIcon()}</div>
      <div className={styles.textContent}>
        <h3>{title}</h3>
        <p>{message}</p>
        {onRetry && (
          <button onClick={onRetry} className={styles.retryButton}>
            {retryText}
          </button>
        )}
      </div>
    </div>
  );
};

export default Error;
