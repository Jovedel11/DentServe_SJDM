import { values } from "../../../../core/common/icons/aboutIcons";
import { milestones } from "../../../../data/about_data/aboutData";
import styles from "../../style/components/about_styles/MissionSection.module.scss";

const MissionSection = () => {
  return (
    <section className={styles.mission}>
      <div className={styles.container}>
        <div className={styles.missionContent}>
          <div className={styles.missionText}>
            <h2>Our Mission</h2>
            <p>
              We're transforming dental care by creating seamless connections
              between patients and providers through innovative technology. Our
              platform eliminates scheduling barriers, reduces administrative
              burdens, and enhances clinical outcomes.
            </p>
            <div className={styles.securityNote}>
              <span>🛡️</span>
              <p>
                All data is encrypted and stored with HIPAA-compliant security
                measures
              </p>
            </div>
            <div className={styles.coreValues}>
              <h3>Our Core Values</h3>
              <div className={styles.valuesGrid}>
                {values.map((value, index) => (
                  <div key={index} className={styles.valueCard}>
                    <div className={styles.valueIcon}>{value.icon}</div>
                    <h4>{value.title}</h4>
                    <p>{value.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className={styles.missionSide}>
            <div className={styles.milestones}>
              <h3>Our Journey</h3>
              <div className={styles.timeline}>
                {milestones.map((milestone, index) => (
                  <div key={index} className={styles.milestone}>
                    <div className={styles.year}>{milestone.year}</div>
                    <div className={styles.event}>{milestone.event}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MissionSection;
