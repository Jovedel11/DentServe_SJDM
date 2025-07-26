import React from "react";
import styles from "./CopyrightSection.module.scss";

const legalLinks = [
  { text: "Privacy Policy", href: "#privacy" },
  { text: "Terms of Service", href: "#terms" },
  { text: "Cookie Settings", href: "#cookies" },
];

const CopyrightSection = () => {
  const currentYear = new Date().getFullYear();

  return (
    <section className={styles.section}>
      <div className={styles.content}>
        <p>© {currentYear} Scope Dental. All rights reserved.</p>
        <div className={styles.links}>
          {legalLinks.map((link, index) => (
            <React.Fragment key={index}>
              <a href={link.href}>{link.text}</a>
              {index < legalLinks.length - 1 && (
                <span className={styles.divider}>|</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CopyrightSection;
