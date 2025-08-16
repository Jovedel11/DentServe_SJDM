import { features } from "@/core/common/icons/aboutIcons";
import styles from "../../style/components/about_styles/FeaturesSection.module.scss";

const FeaturesSection = () => {
  return (
    <section className={styles.features}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2>Platform Features</h2>
          <p>Designed for modern dental healthcare needs</p>
        </div>
        <div className={styles.featuresGrid}>
          {features.map((feature, index) => (
            <div key={index} className={styles.featureCard}>
              <div className={styles.featureIcon}>{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
