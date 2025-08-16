import { features } from "@/core/common/icons/homeIcons.jsx";
import { benefits } from "@/data/home_data/homeData.js";
import styles from "../../style/components/home_styles/Services.module.scss";

const Services = () => {
  return (
    <section className={styles.services}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Practice Management Solutions</h2>
          <p className={styles.subtitle}>
            Streamlining Dental Care Through Technology
          </p>
        </div>

        <div className={styles.featuresGrid}>
          {features.map((feature, index) => (
            <div key={index} className={styles.featureCard}>
              <div className={styles.icon}>{feature.icon}</div>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <ul className={styles.featureList}>
                {feature.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className={styles.benefits}>
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
        </div>
      </div>
    </section>
  );
};

export default Services;
