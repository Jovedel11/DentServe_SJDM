import HeroSection from "../components/home_components/HeroSection";
import Map from "../components/home_components/Map";
import AboutUs from "../components/home_components/AboutUs";
import Services from "../components//home_components/Services";
import Testimonials from "../components/home_components/Testimonials";
import Collaboration from "../components//home_components/Collaboration";
import FAQSection from "../components//home_components/FAQSection";
import SatisfactionPromise from "../components/home_components/SatisfactionPromise";
import styles from "../style/pages/Home.module.scss";
import { FloatButton } from "antd";

const Home = () => {
  return (
    <div className={styles.homeContainer}>
      <section className={`${styles.section}`} id="hero">
        <HeroSection />
      </section>

      <section className={`${styles.section}`} id="map">
        <Map />
      </section>

      <section className={`${styles.section}`} id="about">
        <AboutUs />
      </section>

      <section className={`${styles.section}`} id="services">
        <Services />
      </section>

      <section className={`${styles.section}`} id="testimonials">
        <Testimonials />
      </section>

      <section className={`${styles.section}`} id="collaboration">
        <Collaboration />
      </section>

      <section
        className={`${styles.section} ${styles.sectionSpacing}`}
        id="faq"
      >
        <FAQSection />
      </section>

      <section
        className={`${styles.section} ${styles.sectionSpacing}`}
        id="satisfaction"
      >
        <SatisfactionPromise />
      </section>

      {/* back to Top Button */}
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

      {/* Scroll Progress Indicator */}
      <div className={styles.scrollProgress} id="scroll-progress" />
    </div>
  );
};

export default Home;
