import { motion } from "framer-motion";
import { FaArrowRight } from "react-icons/fa";
import styles from "./SignUpSection.module.scss";

const SignUpSection = () => {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.content}>
          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Ready to Transform Your Dental Experience?
          </motion.h3>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            Join thousands of satisfied patients who trust us for their dental
            needs.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <motion.button
              className={styles.button}
              whileHover={{ scale: 1.03, backgroundColor: "#1a3a5f" }}
              whileTap={{ scale: 0.98 }}
            >
              Get Started <FaArrowRight className={styles.arrow} />
            </motion.button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default SignUpSection;
