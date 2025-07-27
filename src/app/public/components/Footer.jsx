import React, { useCallback } from "react";
import { FaArrowRight } from "react-icons/fa";
import {
  socialLinks,
  legalLinks,
  steps,
} from "../../../core/common/icons/homeIcons.jsx";
import { footerColumns } from "../../../data/home_data/homeData.js";
import styles from "../style/components/Footer.module.scss";

const Footer = () => {
  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    // to handle newsletter subscription
  }, []);

  const currentYear = new Date().getFullYear();

  return (
    <footer
      className={styles.footer}
      role="contentinfo"
      aria-label="Website footer"
    >
      {/* How It Works Section */}
      <section
        className={styles.howItWorksSection}
        aria-labelledby="howItWorksTitle"
      >
        <div className={styles.container}>
          <h2 id="howItWorksTitle">Experience Seamless Dental Care</h2>
          <p>
            Your journey to a healthier smile begins with three simple steps.
          </p>

          <div className={styles.stepsGrid}>
            {steps.map((step, index) => (
              <div key={index} className={styles.stepCard}>
                <div className={styles.stepNumber} aria-hidden="true">
                  0{index + 1}
                </div>
                <div className={styles.iconWrapper}>{step.icon}</div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
                <div className={styles.tooltip} title={step.tooltip}>
                  <span className={styles.tooltipIcon} aria-hidden="true">
                    i
                  </span>
                  <span className={styles.tooltipText}>{step.tooltip}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sign Up Section */}
      <section className={styles.signUpSection} aria-labelledby="signUpTitle">
        <div className={styles.container}>
          <div className={styles.signUpContent}>
            <h3 id="signUpTitle">Ready to Transform Your Dental Experience?</h3>
            <p>
              Join thousands of satisfied patients who trust us for their dental
              needs.
            </p>
            <button
              className={styles.signUpButton}
              aria-label="Get started with DentServe"
            >
              Get Started <FaArrowRight className={styles.arrowIcon} />
            </button>
          </div>
        </div>
      </section>

      {/* Footer Links */}
      <section className={styles.footerLinks}>
        <div className={styles.footerGrid}>
          {/* Brand Column */}
          <div className={styles.brandColumn}>
            <div className={styles.brandLogo} aria-label="DentServe">
              DentServe
            </div>
            <p className={styles.brandDescription}>
              Premium dental care solutions with cutting-edge technology and
              personalized service.
            </p>
            <div className={styles.socialLinks}>
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  aria-label={social.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.socialLink}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {footerColumns.map((column, index) => (
            <div
              key={index}
              className={styles.linkColumn}
              aria-labelledby={`col-${index}-title`}
            >
              <h4 id={`col-${index}-title`}>{column.title}</h4>
              <ul>
                {column.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <a href={link.href}>{link.text}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Newsletter Column */}
          <div
            className={styles.newsletterColumn}
            aria-labelledby="newsletterTitle"
          >
            <h4 id="newsletterTitle">Stay Updated</h4>
            <p>Subscribe for dental tips and exclusive offers</p>
            <form className={styles.subscribeForm} onSubmit={handleSubmit}>
              <input
                type="email"
                name="email"
                id="newsletterEmail"
                autoComplete="email"
                placeholder="Your email address"
                className={styles.emailInput}
                aria-label="Email address for newsletter"
                required
              />
              <button
                type="submit"
                className={styles.subscribeButton}
                aria-label="Subscribe to newsletter"
              >
                Subscribe
              </button>
            </form>
            <p className={styles.disclaimer}>
              By subscribing, you agree to our Privacy Policy and consent to
              receive updates.
            </p>
          </div>
        </div>
      </section>

      {/* Copyright Section */}
      <section className={styles.copyrightSection}>
        <div className={styles.copyrightContent}>
          <p>© {currentYear} DentServe. All rights reserved.</p>
          <div className={styles.legalLinks}>
            {legalLinks.map((link, index) => (
              <React.Fragment key={index}>
                <a href={link.href}>{link.text}</a>
                {index < legalLinks.length - 1 && (
                  <span className={styles.divider} aria-hidden="true">
                    |
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>
    </footer>
  );
};

export default Footer;
