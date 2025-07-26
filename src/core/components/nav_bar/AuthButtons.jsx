import React from "react";
import { Link } from "react-router-dom";
import styles from "./AuthButtons.module.scss";

const AuthButtons = ({ isMobile = false, onButtonClick }) => {
  if (isMobile) {
    return (
      <div className={styles.mobileAuth}>
        <Link to="/login" className={styles.authLink}>
          <button
            className={styles.mobileAuthBtn}
            onClick={onButtonClick}
            aria-label="Login"
          >
            Login
          </button>
        </Link>
        <Link to="/signup" className={styles.authLink}>
          <button
            className={`${styles.mobileAuthBtn} ${styles.mobileAuthBtnPrimary}`}
            onClick={onButtonClick}
            aria-label="Sign Up"
          >
            Sign Up
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.auth}>
      <Link to="/login" className={styles.authLink}>
        <button
          className={`${styles.authBtn} ${styles.loginBtn}`}
          aria-label="Login"
        >
          Login
        </button>
      </Link>
      <Link to="/signup" className={styles.authLink}>
        <button
          className={`${styles.authBtn} ${styles.signupBtn}`}
          aria-label="Sign Up"
        >
          Sign Up
        </button>
      </Link>
    </div>
  );
};

export default AuthButtons;
