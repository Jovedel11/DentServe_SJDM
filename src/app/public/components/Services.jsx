import React from "react";
import { motion } from "framer-motion";
import { FaCalendarAlt, FaMapMarkerAlt, FaComments } from "react-icons/fa";
import styles from "../style/components/Services.module.scss";

const Services = () => {
  const features = [
    {
      icon: <FaCalendarAlt />,
      title: "Appointment Management",
      items: [
        "Online booking system",
        "Automated reminders",
        "Calendar sync",
        "Waitlist management",
      ],
    },
    {
      icon: <FaMapMarkerAlt />,
      title: "Clinic Navigation",
      items: [
        "Real-time availability",
        "Location tracking",
        "Accessibility features",
        "Interactive practice map",
      ],
    },
    {
      icon: <FaComments />,
      title: "Patient Engagement",
      items: [
        "Secure messaging",
        "Treatment feedback",
        "Automated follow-ups",
        "Oral health resources",
      ],
    },
  ];

  const benefits = {
    patient: [
      "24/7 appointment access",
      "Reduced waiting times",
      "Treatment plan tracking",
    ],
    clinic: [
      "Optimized scheduling",
      "Digital workflow automation",
      "Patient satisfaction insights",
    ],
  };

  return (
    <section className={styles.services}>
      <div className={styles.container}>
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className={styles.title}>Practice Management Solutions</h2>
          <p className={styles.subtitle}>
            Streamlining Dental Care Through Technology
          </p>
        </motion.div>

        <div className={styles.featuresGrid}>
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className={styles.featureCard}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -8 }}
            >
              <div className={styles.icon}>{feature.icon}</div>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <ul className={styles.featureList}>
                {feature.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <motion.div
          className={styles.benefits}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className={styles.benefitsGrid}>
            <div className={styles.benefitCard}>
              <h4>Patient Benefits</h4>
              <ul>
                {benefits.patient.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            <div className={styles.benefitCard}>
              <h4>Clinic Advantages</h4>
              <ul>
                {benefits.clinic.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Services;
