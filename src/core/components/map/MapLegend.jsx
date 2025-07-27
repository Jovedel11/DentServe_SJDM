import React from "react";
import styles from "./MapLegend.module.scss";

const MapLegend = React.memo(() => (
  <div className={styles.mapLegend} role="region" aria-label="Map legend">
    <div className={styles.legendHeader}>
      <h3 className={styles.legendTitle}>Feedback Levels</h3>
      <span className={styles.legendSubtitle}>
        Based on daily patient feedback
      </span>
    </div>

    <div className={styles.legendItems}>
      <div className={styles.legendItem}>
        <div className={`${styles.legendMarker} ${styles.high}`}></div>
        <div className={styles.legendText}>
          <strong>High</strong>
          <span>8-10/day</span>
        </div>
      </div>

      <div className={styles.legendItem}>
        <div className={`${styles.legendMarker} ${styles.medium}`}></div>
        <div className={styles.legendText}>
          <strong>Moderate</strong>
          <span>4-7/day</span>
        </div>
      </div>

      <div className={styles.legendItem}>
        <div className={`${styles.legendMarker} ${styles.low}`}></div>
        <div className={styles.legendText}>
          <strong>Low</strong>
          <span>0-3/day</span>
        </div>
      </div>

      <div className={styles.updateInfo}>
        <span>Updated every 15 minutes</span>
      </div>
    </div>
  </div>
));

export default MapLegend;
