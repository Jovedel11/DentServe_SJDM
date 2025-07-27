import React from "react";
import styles from "./ClinicPanel.module.scss";

const getFeedbackClass = (count) => {
  if (count >= 8) return styles.high;
  if (count >= 4) return styles.medium;
  return styles.low;
};

const getFeedbackText = (count) => {
  if (count >= 8) return "High Feedback (8-10/day)";
  if (count >= 4) return "Moderate Feedback (4-7/day)";
  return "Low Feedback (0-3/day)";
};

const ClinicPanel = React.memo(({ clinic, onClose }) => {
  return (
    <div
      className={styles.clinicPanel}
      role="region"
      aria-label="Clinic details"
    >
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h3 className={styles.clinicName}>{clinic.name}</h3>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close clinic details"
          >
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div
          className={`${styles.feedbackBadge} ${getFeedbackClass(
            clinic.feedbackCount
          )}`}
          aria-label={getFeedbackText(clinic.feedbackCount)}
        >
          {getFeedbackText(clinic.feedbackCount)}
        </div>
      </div>

      <div className={styles.details}>
        <div className={styles.detailItem}>
          <div className={styles.iconWrapper}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <span className={styles.detailText}>{clinic.address}</span>
        </div>

        <div className={styles.detailItem}>
          <div className={styles.iconWrapper}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <span className={styles.detailText}>{clinic.operating_hours}</span>
        </div>
      </div>

      <div className={styles.actions}>
        <p className={styles.authPrompt}>
          Sign in to view services and book appointments
        </p>
        <div className={styles.authButtons}>
          <button
            className={styles.btnOutline}
            onClick={() => console.log("Login initiated")}
          >
            Log In
          </button>
          <button
            className={styles.btnPrimary}
            onClick={() => console.log("Signup initiated")}
          >
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
});

export default ClinicPanel;
