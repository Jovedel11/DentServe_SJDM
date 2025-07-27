import { teamMembers } from "../../../../data/about_data/aboutData";
import styles from "../../style/components/about_styles/TeamSection.module.scss";

const TeamSection = () => {
  return (
    <section className={styles.team}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2>Our Leadership Team</h2>
          <p>Experts in dental care and technology innovation</p>
        </div>
        <div className={styles.teamGrid}>
          {teamMembers.map((member, index) => (
            <div key={index} className={styles.teamCard}>
              <div className={styles.teamImage}>
                <div className={styles.avatar}>{member.name.charAt(0)}</div>
              </div>
              <h3>{member.name}</h3>
              <p className={styles.teamRole}>{member.role}</p>
              <p className={styles.teamBio}>{member.bio}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TeamSection;
