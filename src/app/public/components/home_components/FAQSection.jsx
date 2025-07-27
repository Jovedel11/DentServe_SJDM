import { useState } from "react";
import { faqItems } from "../../../../data/home_data/homeData";
import styles from "../../style/components/home_styles/FAQSection.module.scss";

const FAQSection = () => {
  const [activeIndex, setActiveIndex] = useState(null);

  const handleItemClick = (id) => {
    setActiveIndex(activeIndex === id ? null : id);
  };

  return (
    <section className={styles.faqSection}>
      <div className={styles.header}>
        <h2>Frequently Asked Questions</h2>
        <p>Quick answers to common questions about appointments and services</p>
      </div>

      <div className={styles.faqGrid}>
        {faqItems.map((item) => (
          <div
            key={item.id}
            className={`${styles.faqItem} ${
              activeIndex === item.id ? styles.active : ""
            }`}
            onClick={() => handleItemClick(item.id)}
          >
            <div className={styles.faqQuestion}>
              <span className={styles.icon}>
                {activeIndex === item.id ? "−" : "+"}
              </span>
              <h3>{item.question}</h3>
            </div>
            <div className={styles.faqAnswer}>
              <p>{item.answer}</p>
              {item.extraInfo && (
                <div className={styles.extraInfo}>
                  <svg className={styles.infoIcon} viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                  </svg>
                  <span>
                    Late cancellations may incur clinic-specific policies
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FAQSection;
