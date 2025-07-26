import React from "react";
import { Link } from "react-router-dom";
import styles from "./Logo.module.scss";

const Logo = () => {
  return (
    <Link to="/" className={styles.logo} aria-label="DentServe Home">
      <div className={styles.logoContainer}>
        <div className={styles.logoImageWrapper}>
          <img
            src="/assets/images/logo.png"
            alt="DentServe Logo"
            className={styles.logoImage}
            loading="eager"
            width="28"
            height="28"
          />
        </div>
        <span className={styles.logoText}>DentServe</span>
      </div>
    </Link>
  );
};

export default Logo;
