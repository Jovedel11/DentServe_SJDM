import React, { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  FaClinicMedical,
  FaChartLine,
  FaUsers,
  FaCalendarCheck,
  FaHandshake,
} from "react-icons/fa";
import styles from "../style/components/Collaboration.module.scss";

const Collaboration = () => {
  const shouldReduceMotion = useReducedMotion();

  const fadeIn = useMemo(() => {
    return (delay = 0) => ({
      initial: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
      whileInView: { opacity: 1, y: 0 },
      viewport: { once: true, margin: "0px 0px -100px 0px" },
      transition: {
        delay,
        duration: shouldReduceMotion ? 0 : 0.6,
        ease: "easeOut",
      },
    });
  }, [shouldReduceMotion]);

  const benefits = useMemo(
    () => [
      {
        icon: <FaUsers />,
        title: "Expand Your Patient Base",
        description:
          "Reach thousands of patients actively searching for quality dental care in your area",
      },
      {
        icon: <FaChartLine />,
        title: "Boost Practice Efficiency",
        description:
          "Reduce no-shows by 40% with automated reminders and streamlined scheduling",
      },
      {
        icon: <FaCalendarCheck />,
        title: "Optimize Appointment Bookings",
        description:
          "Fill last-minute openings and reduce downtime with our intelligent booking system",
      },
      {
        icon: <FaClinicMedical />,
        title: "Modern Practice Management",
        description:
          "Access powerful analytics to make data-driven decisions about your practice",
      },
    ],
    []
  );

  const stats = useMemo(
    () => [
      { number: "42%", label: "Average increase in new patients" },
      { number: "87%", label: "Reduction in administrative time" },
      { number: "4.8/5", label: "Average partner satisfaction rating" },
    ],
    []
  );

  return (
    <motion.section
      className={styles.collaboration}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.textContent}>
            <motion.div {...fadeIn(0.2)}>
              <span className={styles.subtitle}>GROW WITH US</span>
              <h2 className={styles.title}>
                Transform Your Practice with <span>Digital Excellence</span>
              </h2>
              <p className={styles.description}>
                Join hundreds of dental practices that have modernized their
                operations and enhanced patient experiences with our platform.
                Become part of a network that's setting new standards in dental
                care.
              </p>
            </motion.div>

            <div className={styles.benefitsGrid}>
              {benefits.map((benefit, index) => (
                <motion.div
                  className={styles.benefitCard}
                  key={index}
                  {...fadeIn(0.3 + index * 0.1)}
                >
                  <div className={styles.benefitIcon}>{benefit.icon}</div>
                  <h4>{benefit.title}</h4>
                  <p>{benefit.description}</p>
                </motion.div>
              ))}
            </div>

            <motion.div {...fadeIn(0.6)} className={styles.ctaContainer}>
              <motion.button
                className={styles.ctaButton}
                whileHover={{ scale: shouldReduceMotion ? 1 : 1.05 }}
                whileTap={{ scale: shouldReduceMotion ? 1 : 0.95 }}
              >
                <FaHandshake className={styles.buttonIcon} />
                Join Our Network Today
              </motion.button>
              <p className={styles.ctaNote}>
                No setup fees • Free onboarding • 30-day trial
              </p>
            </motion.div>
          </div>

          <motion.div
            className={styles.visualContent}
            initial={{ opacity: 0, x: shouldReduceMotion ? 0 : 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{
              delay: 0.4,
              duration: shouldReduceMotion ? 0 : 0.7,
            }}
          >
            <div className={styles.statsCard}>
              {stats.map((stat, index) => (
                <div className={styles.statItem} key={index}>
                  <span className={styles.statNumber}>{stat.number}</span>
                  <span className={styles.statLabel}>{stat.label}</span>
                </div>
              ))}
            </div>

            <div className={styles.testimonialCard}>
              <div className={styles.quoteIcon}>❝</div>
              <p className={styles.quote}>
                Since joining this platform, our clinic has seen a 35% increase
                in bookings and significantly reduced no-shows. The automated
                system handles what used to take hours of staff time.
              </p>
              <div className={styles.author}>
                <div className={styles.authorImage}></div>
                <div className={styles.authorInfo}>
                  <strong>Dr. Sarah Johnson</strong>
                  <span>DentalCare Associates</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
};

export default React.memo(Collaboration);
