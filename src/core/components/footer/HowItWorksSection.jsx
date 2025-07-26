import React from "react";
import { motion } from "framer-motion";
import { FaUserPlus, FaCalendarCheck, FaCheckCircle } from "react-icons/fa";
import styles from "./HowItWorksSection.module.scss";

const steps = [
  {
    icon: <FaUserPlus />,
    title: "Register Effortlessly",
    description:
      "Create your account in under 30 seconds via email or social media.",
    tooltip: "We prioritize your privacy and data security.",
  },
  {
    icon: <FaCalendarCheck />,
    title: "Schedule with Ease",
    description:
      "Select your preferred service, clinic location, and appointment time.",
    tooltip: "See real-time appointment availability.",
  },
  {
    icon: <FaCheckCircle />,
    title: "Confirm and Arrive",
    description:
      "Receive instant booking confirmation and step-by-step directions.",
    tooltip: "We'll also send helpful appointment reminders.",
  },
];

const StepCard = ({ step, index }) => (
  <motion.div
    className={styles.stepCard}
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay: index * 0.1 }}
    whileHover={{ y: -5 }}
  >
    <div className={styles.stepNumber}>0{index + 1}</div>
    <div className={styles.iconWrapper}>
      <motion.div whileHover={{ rotate: 10, scale: 1.1 }}>
        {step.icon}
      </motion.div>
    </div>
    <h3>{step.title}</h3>
    <p>{step.description}</p>
    <div className={styles.tooltip}>
      <span className={styles.tooltipIcon}>i</span>
      <span className={styles.tooltipText}>{step.tooltip}</span>
    </div>
  </motion.div>
);

const HowItWorksSection = () => {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          Experience Seamless Dental Care
        </motion.h2>
        <motion.p
          className={styles.subtitle}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          Your journey to a healthier smile begins with three simple steps.
        </motion.p>

        <div className={styles.stepsGrid}>
          {steps.map((step, index) => (
            <StepCard key={index} step={step} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
