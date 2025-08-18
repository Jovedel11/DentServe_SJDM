import { useState, useEffect } from "react";
import { FaMapMarkerAlt, FaUserPlus } from "react-icons/fa";
import styles from "../../style/components/service_styles/ServiceHero.module.scss";
import Skeleton from "@/core/components/Skeleton";

const ServicesHero = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <Skeleton width="100%" height="400px" />;
  }

  return (
    <section className={styles.heroSection}>
      <div className={styles.heroContent}>
        <h1 className={styles.heroTitle}>Premier Dental Care Services</h1>
        <p className={styles.heroSubtitle}>
          Experience exceptional dental care with our comprehensive services
        </p>
        <div className={styles.heroButtons}>
          <button className={styles.primaryButton}>
            <FaMapMarkerAlt /> Find Nearby Clinics
          </button>
          <button className={styles.secondaryButton}>
            <FaUserPlus /> Create Account
          </button>
        </div>
      </div>
      <div className={styles.heroIllustration}>
        <div className={styles.dentalChair}></div>
      </div>
    </section>
  );
};

export default ServicesHero;
