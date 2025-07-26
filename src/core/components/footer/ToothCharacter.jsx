import React from "react";
import { motion } from "framer-motion";
import styles from "./ToothCharacter.module.scss";

const ToothCharacter = ({ position }) => {
  return (
    <motion.div
      className={styles.tooth}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: 1,
        scale: 1,
        x: position.x - 25,
        y: position.y - 25,
      }}
      exit={{ opacity: 0, scale: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <svg
        width="50"
        height="50"
        viewBox="0 0 100 100"
        focusable="false"
        aria-hidden="true"
      >
        <motion.path
          d="M50,15 C70,15 85,30 85,50 C85,70 70,85 50,85 C30,85 15,70 15,50 C15,30 30,15 50,15 Z"
          fill="#F0FDFF"
          stroke="#00FFFF"
          strokeWidth="4"
          animate={{ rotate: [0, 5, -5, 3, 0] }}
          transition={{ repeat: Infinity, duration: 2, repeatType: "mirror" }}
        />
        <motion.circle
          cx="35"
          cy="40"
          r="6"
          fill="#0a192f"
          animate={{ scaleY: [1, 0.2, 1] }}
          transition={{ repeat: Infinity, duration: 2, repeatDelay: 1 }}
        />
        <motion.circle
          cx="65"
          cy="40"
          r="6"
          fill="#0a192f"
          animate={{ scaleY: [1, 0.2, 1] }}
          transition={{ repeat: Infinity, duration: 2, repeatDelay: 1.2 }}
        />
        <motion.path
          d="M35,65 Q50,75 65,65"
          fill="none"
          stroke="#0a192f"
          strokeWidth="4"
          strokeLinecap="round"
          animate={{
            d: [
              "M35,65 Q50,75 65,65",
              "M35,60 Q50,80 65,60",
              "M35,65 Q50,75 65,65",
            ],
          }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </svg>
    </motion.div>
  );
};

export default ToothCharacter;
