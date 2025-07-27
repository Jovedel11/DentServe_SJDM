import { useState } from "react";
import { faqItems } from "../../../../data/about_data/aboutData";
import styles from "../../style/components/about_styles/FAQSection.module.scss";

const FAQSection = () => {
  const [activeFaq, setActiveFaq] = useState(null);

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  return (
    <section className={styles.faq}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2>Frequently Asked Questions</h2>
          <p>Answers to common and technical queries</p>
        </div>
        <div className={styles.faqContainer}>
          {faqItems.map((item, index) => (
            <div
              key={index}
              className={`${styles.faqItem} ${
                activeFaq === index ? styles.active : ""
              }`}
            >
              <h3 onClick={() => toggleFaq(index)}>
                {item.question}
                <span>{activeFaq === index ? "−" : "+"}</span>
              </h3>
              {activeFaq === index && (
                <div className={styles.faqAnswer}>
                  <p>{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
