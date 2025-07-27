import { FaUserShield, FaRegLightbulb } from "react-icons/fa";
import { stats } from "../../../../data/about_data/aboutData";
import styles from "../../style/components/about_styles/HeroSection.module.scss";

const HeroSection = () => {
  return (
    <section className={styles.hero}>
      <div className={styles.container}>
        <div className={styles.trustBadge}>
          <FaUserShield />
          <span>HIPAA-Compliant Platform</span>
        </div>
        <h1>Revolutionizing Dental Care Accessibility</h1>
        <p className={styles.lead}>
          Connecting <span className={styles.highlight}>patients</span> with{" "}
          <span className={styles.highlight}>accredited professionals</span>{" "}
          through secure, intelligent healthcare technology.
        </p>
        <div className={styles.valueProposition}>
          <FaRegLightbulb className={styles.bulbIcon} />
          <p>
            Simplifying dental care access through technology innovation and
            trusted partnerships
          </p>
        </div>
        <div className={styles.stats}>
          {stats.map((stat, index) => (
            <div key={index} className={styles.statCard}>
              <h3>{stat.value}</h3>
              <p>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
