import { motion } from "framer-motion";
import {
  FaHandHoldingHeart,
  FaShieldAlt,
  FaHeadset,
  FaArrowRight,
} from "react-icons/fa";
import styles from "../../style/components/home_styles/SatisfactionPromise.module.scss";

const SatisfactionPromise = () => {
  return (
    <section className={styles.promiseSection}>
      <div className={styles.container}>
        <div className={styles.layout}>
          <motion.div
            className={styles.header}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className={styles.iconWrapper}>
              <FaHandHoldingHeart className={styles.mainIcon} />
            </div>
            <h2>Our Commitment to Your Satisfaction</h2>
            <p>
              We stand behind every aspect of your experience. Your complete
              satisfaction is our top priority.
            </p>
          </motion.div>

          <div className={styles.content}>
            <div className={styles.cards}>
              <motion.div
                className={styles.card}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.1 }}
                whileHover={{ y: -3 }}
              >
                <div className={styles.cardIcon}>
                  <FaShieldAlt />
                </div>
                <h3>Service Guarantee</h3>
                <p>
                  If your appointment doesn't meet expectations, we'll work with
                  you to make it right or find a better solution.
                </p>
              </motion.div>

              <motion.div
                className={styles.card}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.2 }}
                whileHover={{ y: -3 }}
              >
                <div className={styles.cardIcon}>
                  <FaHeadset />
                </div>
                <h3>Dedicated Support</h3>
                <p>
                  Our customer success team is available to assist you with any
                  questions or concerns about your dental care journey.
                </p>
              </motion.div>
            </div>

            <motion.div
              className={styles.buttonWrapper}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <motion.button
                className={styles.contactButton}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Contact Support
                <FaArrowRight className={styles.arrowIcon} />
              </motion.button>
              <p className={styles.helpText}>
                Encountered an issue? We're here to help
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SatisfactionPromise;
