import HeroSection from "../components/about_components/HeroSection";
import MissionSection from "../components/about_components/MissionSection";
import FeaturesSection from "../components/about_components/FeaturesSection";
import TestimonialsSection from "../components/about_components/TestimonialsSection";
import TeamSection from "../components/about_components/TeamSection";
import FAQSection from "../components/about_components/FAQSection";
import { FaAward, FaShieldAlt, FaUserShield } from "react-icons/fa";
import styles from "../style/pages/About.module.scss";
import { FloatButton } from "antd";

const About = () => {
  return (
    <main className={styles.aboutPage}>
      <HeroSection />
      <MissionSection />
      <FeaturesSection />
      <TestimonialsSection />
      <TeamSection />

      {/* accreditation section */}
      <section className={styles.accreditations}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2>Recognized Excellence</h2>
            <p>Industry validation of our standards and practices</p>
          </div>
          <div className={styles.badges}>
            <div className={styles.badge}>
              <FaAward />
              <span>ADA Innovation Award 2023</span>
            </div>
            <div className={styles.badge}>
              <FaShieldAlt />
              <span>HIPAA Compliant Certified</span>
            </div>
            <div className={styles.badge}>
              <FaUserShield />
              <span>GDPR & CCPA Certified</span>
            </div>
          </div>
        </div>
      </section>

      <FloatButton.BackTop
        className={styles.backToTop}
        style={{
          right: 30,
          bottom: 30,
          height: 50,
          width: 50,
          boxShadow: "0 4px 20px rgba(9, 216, 113, 0.3)",
          transition: "all 0.3s ease",
        }}
        onClick={() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        visibilityHeight={300}
        duration={800}
      />

      <FAQSection />
    </main>
  );
};

export default About;
