import React from "react";
import { motion } from "framer-motion";
import styles from "./MapLegend.module.scss";

const legendItems = [
  { color: "#64dd9c", label: "High Feedback", range: "8-10/day" },
  { color: "#ffb74d", label: "Moderate Feedback", range: "4-7/day" },
  { color: "#ff8a65", label: "Low Feedback", range: "0-3/day" },
];

const MapLegend = () => {
  const legendItems = [
    { color: "#51cf66", label: "High Feedback", range: "8-10/day" },
    { color: "#ffd43b", label: "Moderate Feedback", range: "4-7/day" },
    { color: "#ff6b6b", label: "Low Feedback", range: "0-3/day" },
  ];

  return (
    <motion.div
      className={styles.legend}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4 }}
    >
      <h4>Patient Feedback</h4>

      <div className={styles.items}>
        {legendItems.map((item, index) => (
          <div key={index} className={styles.item}>
            <div
              className={styles.dot}
              style={{ backgroundColor: item.color }}
            />
            <div className={styles.text}>
              <strong>{item.label}</strong>
              <span>{item.range}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.update}>
        <small>Updated every 15 minutes</small>
      </div>
    </motion.div>
  );
};

export default MapLegend;
