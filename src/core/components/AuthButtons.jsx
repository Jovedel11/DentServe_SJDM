import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import styles from "./AuthButtons.module.scss";

const AuthButtons = () => (
  <div className={styles.authButtons}>
    <Link to="/login">
      <motion.button
        whileHover={{
          scale: 1.05,
          backgroundColor: "#f0f9ff",
        }}
        whileTap={{ scale: 0.98 }}
        className={styles.authButton}
        aria-label="Login"
      >
        <img src="/login-icon.png" alt="Login" className={styles.authIcon} />
      </motion.button>
    </Link>
    <Link to="/signup">
      <motion.button
        whileHover={{
          scale: 1.05,
          boxShadow: "0 6px 15px rgba(2, 132, 199, 0.35)",
        }}
        whileTap={{ scale: 0.98 }}
        className={`${styles.authButton} ${styles.signupButton}`}
        aria-label="Sign Up"
      >
        <img src="/signup-icon.png" alt="Sign Up" className={styles.authIcon} />
      </motion.button>
    </Link>
  </div>
);

export default AuthButtons;
