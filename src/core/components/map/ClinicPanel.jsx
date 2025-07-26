import React from "react";
import { motion } from "framer-motion";
import styles from "./ClinicPanel.module.scss";

const getFeedbackLevel = (count) => {
  if (count >= 8) return { text: "High Feedback (8-10/day)", class: "high" };
  if (count >= 4)
    return { text: "Moderate Feedback (4-7/day)", class: "medium" };
  return { text: "Low Feedback (0-3/day)", class: "low" };
};

const ClinicPanel = ({ clinic, onClose }) => {
  const getFeedbackLevel = (count) => {
    if (count >= 8)
      return { text: "High Feedback", range: "8-10/day", class: "high" };
    if (count >= 4)
      return { text: "Moderate Feedback", range: "4-7/day", class: "medium" };
    return { text: "Low Feedback", range: "0-3/day", class: "low" };
  };

  const feedback = getFeedbackLevel(clinic.feedbackCount);

  return (
    <motion.div
      className={styles.panel}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.header}>
        <div className={styles.clinicInfo}>
          <h3>{clinic.name}</h3>
          <div className={`${styles.badge} ${styles[feedback.class]}`}>
            {feedback.text} ({feedback.range})
          </div>
        </div>
        <button className={styles.closeBtn} onClick={onClose}>
          ×
        </button>
      </div>

      <div className={styles.details}>
        <div className={styles.item}>
          <span className={styles.icon}>📍</span>
          <span>{clinic.address}</span>
        </div>
        <div className={styles.item}>
          <span className={styles.icon}>🕐</span>
          <span>{clinic.operating_hours}</span>
        </div>
      </div>

      <div className={styles.actions}>
        <p>Sign in to book appointments and view services</p>
        <div className={styles.buttons}>
          <button className={styles.loginBtn}>Log In</button>
          <button className={styles.signupBtn}>Sign Up</button>
        </div>
      </div>
    </motion.div>
  );
};

export default ClinicPanel;
