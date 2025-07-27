import { motion } from "framer-motion";
import styles from "../../style/components/home_styles/AboutUs.module.scss";

// mock images
import Example1 from "../../../../../public/assets/images/example1.png";
import Example2 from "../../../../../public/assets/images/example2.png";
import Example3 from "../../../../../public/assets/images/example3.png";
import Example4 from "../../../../../public/assets/images/example4.png";

const AboutUs = () => {
  const images = [Example1, Example2, Example3, Example4];
  const stats = [
    { number: "250+", label: "Clinics Served" },
    { number: "98%", label: "Patient Satisfaction" },
    { number: "40%", label: "Reduced Wait Times" },
  ];

  return (
    <section className={styles.aboutIntro}>
      <div className={styles.container}>
        <div className={styles.content}>
          <motion.div
            className={styles.textContent}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className={styles.title}>
              Revolutionizing Dental Care Through Technology
            </h2>
            <p className={styles.description}>
              At DentAll, we're transforming how dental practices operate and
              patients experience care. Our platform bridges the gap between
              modern technology and dental health, creating seamless experiences
              for both providers and patients.
            </p>
            <p className={styles.description}>
              Founded by dental professionals and tech innovators, we understand
              the unique challenges of managing dental appointments and
              delivering exceptional patient care.
            </p>
            <button className={styles.button}>Discover Our Story</button>
          </motion.div>

          <motion.div
            className={styles.visualContent}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className={styles.imageGrid}>
              {images.map((src, index) => (
                <div key={index} className={styles.imageItem}>
                  <img
                    src={src}
                    alt={`Dental clinic service ${index + 1}`}
                    className={styles.image}
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div
          className={styles.statsContainer}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          {stats.map((stat, index) => (
            <div key={index} className={styles.statItem}>
              <span className={styles.statNumber}>{stat.number}</span>
              <span className={styles.statLabel}>{stat.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default AboutUs;
