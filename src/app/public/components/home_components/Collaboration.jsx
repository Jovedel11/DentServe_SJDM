import React from "react";
import { FaHandshake } from "react-icons/fa";
import { benefits } from "../../../../core/common/icons/homeIcons";
import { stats } from "../../../../data/home_data/homeData";
import styles from "../../style/components/home_styles/Collaboration.module.scss";

const Collaboration = () => {
  return (
    // collaboration section
    <section className={styles.collaboration}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.textContent}>
            <div className={styles.header}>
              <span className={styles.subtitle}>GROW WITH US</span>
              <h2 className={styles.title}>
                Transform Your Practice with <span>Digital Excellence</span>
              </h2>
              <p className={styles.description}>
                Join hundreds of dental practices that have modernized their
                operations and enhanced patient experiences with our platform.
                Become part of a network that's setting new standards in dental
                care.
              </p>
            </div>
            <div className={styles.benefitsGrid}>
              {benefits.map((benefit, index) => (
                <div className={styles.benefitCard} key={index}>
                  <div className={styles.benefitIcon}>{benefit.icon}</div>
                  <div className={styles.benefitContent}>
                    <h4>{benefit.title}</h4>
                    <p>{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* call to action */}
            <div className={styles.ctaContainer}>
              <button className={styles.ctaButton}>
                <FaHandshake className={styles.buttonIcon} />
                Join Our Network Today
              </button>
              <p className={styles.ctaNote}>
                No setup fees • Free onboarding • 30-day trial
              </p>
            </div>
          </div>

          <div className={styles.visualContent}>
            <div className={styles.statsCard}>
              {stats.map((stat, index) => (
                <div className={styles.statItem} key={index}>
                  <span className={styles.statNumber}>{stat.number}</span>
                  <span className={styles.statLabel}>{stat.label}</span>
                </div>
              ))}
            </div>
            {/* testimonial card */}
            <div className={styles.testimonialCard}>
              <div className={styles.quoteIcon}>❝</div>
              <p className={styles.quote}>
                Since joining this platform, our clinic has seen a 35% increase
                in bookings and significantly reduced no-shows. The automated
                system handles what used to take hours of staff time.
              </p>
              <div className={styles.author}>
                <div className={styles.authorImage}></div>
                <div className={styles.authorInfo}>
                  <strong>Dr. Sarah Johnson</strong>
                  <span>DentalCare Associates</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default React.memo(Collaboration);
