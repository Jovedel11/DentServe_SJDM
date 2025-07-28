import React from "react";
import styles from "./ErrorPage.module.scss";
import { useNavigate } from "react-router-dom";

const ErrorPage = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.illustration}>
          <div className={styles.toothIcon}>
            <div className={styles.toothCrown}></div>
            <div className={styles.toothRoot}></div>
          </div>
          <div className={styles.errorIndicator}>404</div>
        </div>

        <h1 className={styles.title}>Oops! That page is missing</h1>
        <p className={styles.description}>
          We couldn't find the page you're looking for. It might have been moved
          or deleted. Let's get you back on track for your dental care journey.
        </p>

        <div className={styles.actions}>
          <button
            className={styles.primaryButton}
            onClick={() => navigate("/")}
            aria-label="Return to homepage"
          >
            Return to Homepage
          </button>

          <div className={styles.secondaryActions}>
            <button
              className={styles.secondaryButton}
              onClick={() => navigate("/contact")}
              aria-label="Contact support"
            >
              Contact Support
            </button>
            <button
              className={styles.secondaryButton}
              onClick={() => navigate("/report")}
              aria-label="Report a broken link"
            >
              Report Broken Link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;
