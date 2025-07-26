import { useState, useMemo, memo, useCallback } from "react";
import classNames from "classnames";
import styles from "../style/components/FAQSection.module.scss";

const FAQItem = memo(
  ({ id, question, answer, extraInfo, isActive, onClick }) => {
    const handleClick = useCallback(() => onClick(id), [id, onClick]);

    return (
      <div
        className={classNames(styles.faqItem, {
          [styles.active]: isActive,
        })}
        onClick={handleClick}
      >
        <div className={styles.faqQuestion}>
          <span className={styles.icon}>{isActive ? "−" : "+"}</span>
          <h3>{question}</h3>
        </div>
        <div className={styles.faqAnswer}>
          <p>{answer}</p>
          {extraInfo && (
            <div className={styles.extraInfo}>
              <svg className={styles.infoIcon} viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
              </svg>
              <span>Late cancellations may incur clinic-specific policies</span>
            </div>
          )}
        </div>
      </div>
    );
  }
);

const FAQSection = () => {
  const [activeIndex, setActiveIndex] = useState(null);

  const faqItems = useMemo(
    () => [
      {
        id: 1,
        question: "Do I need an account to book?",
        answer:
          "No account required! Enjoy our guest booking feature for quick reservations. Optionally create an account to track your appointments and access exclusive features.",
      },
      {
        id: 2,
        question: "Is the booking free?",
        answer:
          "Our booking platform is completely free to use. You'll only be charged for services provided by the clinic, with full price transparency before confirmation.",
      },
      {
        id: 3,
        question: "Will I receive a confirmation?",
        answer:
          "Instant digital receipt! Receive SMS and email confirmation with appointment details, clinic location map, and preparation guidelines immediately after booking.",
        extraInfo: true,
      },
      {
        id: 4,
        question: "Can I reschedule or cancel appointments?",
        answer:
          "Flexible changes available! Modify or cancel appointments up to 24 hours prior through your confirmation link or patient dashboard, subject to clinic policies.",
      },
      {
        id: 5,
        question: "How do I know clinic availability?",
        answer:
          "Real-time availability updates! Color-coded indicators show clinic capacity: Green (Plenty), Amber (Limited), Red (Fully Booked).",
      },
      {
        id: 6,
        question: "What safety measures are in place?",
        answer:
          "All partner clinics maintain our strict Safety Certified standards. Look for the shield icon indicating enhanced sanitation protocols and staff certifications.",
      },
    ],
    []
  );

  const handleItemClick = useCallback((id) => {
    setActiveIndex((prev) => (prev === id ? null : id));
  }, []);

  return (
    <section className={styles.faqSection}>
      <div className={styles.header}>
        <h2>Frequently Asked Questions</h2>
        <p>Quick answers to common questions about appointments and services</p>
      </div>

      <div className={styles.faqGrid}>
        {faqItems.map((item) => (
          <FAQItem
            key={item.id}
            id={item.id}
            question={item.question}
            answer={item.answer}
            extraInfo={item.extraInfo}
            isActive={activeIndex === item.id}
            onClick={handleItemClick}
          />
        ))}
      </div>
    </section>
  );
};

export default memo(FAQSection);
