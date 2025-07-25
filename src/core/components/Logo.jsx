import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import styles from "./Logo.module.scss";

const Logo = () => (
  <Link to="/" className={styles.logo} aria-label="DentServe Home">
    <motion.div
      className={styles.logoContainer}
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 400, damping: 10 }}
    >
      <motion.img
        src="/logo.png"
        alt="DentServe Logo"
        className={styles.logoImage}
        width={40}
        height={40}
        whileHover={{ rotate: 5 }}
        transition={{ duration: 0.3 }}
      />
      <motion.span
        className={styles.logoText}
        whileHover={{ color: "#0284c7" }}
        transition={{ duration: 0.2 }}
      >
        DentServe
      </motion.span>
    </motion.div>
  </Link>
);

export default Logo;
