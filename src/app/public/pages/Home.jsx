import HeroSection from "../components/HeroSection";
import Map from "../components/Map";
import AboutUs from "../components/AboutUs";
import Services from "../components/Services";
import Testimonials from "../components/Testimonials";
import Collaboration from "../components/Collaboration";
import FAQSection from "../components/FAQSection";
import SatisfactionPromise from "../components/SatisfactionPromise";
import styles from "../style/pages/Home.module.scss";
import { FloatButton } from "antd";

const Home = () => {
  return (
    <div className={styles.homeContainer}>
      <div className={styles.sectionSpacing}>
        <HeroSection />
      </div>
      <div>
        <Map />
      </div>
      <div>
        <AboutUs />
      </div>
      <div>
        <Services />
      </div>
      <div>
        <Testimonials />
      </div>
      <div>
        <Collaboration />
      </div>
      <div className={styles.sectionSpacing}>
        <FAQSection />
      </div>
      <div className={styles.sectionSpacing}>
        <SatisfactionPromise />
      </div>
      <FloatButton.BackTop
        style={{
          right: 30,
          bottom: 30,
          height: 50,
          width: 50,
          boxShadow: "10px 15px 20px rgba(9, 216, 113, 0.49)",
        }}
      />
    </div>
  );
};

export default Home;
