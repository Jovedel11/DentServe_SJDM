import { motion } from "framer-motion";
import {
  FaTwitter,
  FaInstagram,
  FaLinkedinIn,
  FaYoutube,
} from "react-icons/fa";
import styles from "./FooterLinks.module.scss";

const footerData = {
  brand: {
    name: "Scope",
    description:
      "Premium dental care solutions with cutting-edge technology and personalized service.",
  },
  columns: [
    {
      title: "Services",
      links: [
        { text: "General Dentistry", href: "#services" },
        { text: "Cosmetic Procedures", href: "#cosmetic" },
        { text: "Orthodontics", href: "#orthodontics" },
        { text: "Pediatric Care", href: "#pediatric" },
        { text: "Emergency Services", href: "#emergency" },
      ],
    },
    {
      title: "Company",
      links: [
        { text: "About Us", href: "#about" },
        { text: "Careers", href: "#careers" },
        { text: "Press", href: "#press" },
        { text: "Testimonials", href: "#testimonials" },
        { text: "Blog", href: "#blog" },
      ],
    },
    {
      title: "Support",
      links: [
        { text: "Help Center", href: "#help" },
        { text: "Contact Us", href: "#contact" },
        { text: "FAQs", href: "#faq" },
        { text: "Patient Guides", href: "#guides" },
        { text: "Feedback", href: "#feedback" },
      ],
    },
  ],
  socialLinks: [
    { icon: <FaTwitter />, label: "Twitter", href: "https://twitter.com" },
    {
      icon: <FaInstagram />,
      label: "Instagram",
      href: "https://instagram.com",
    },
    { icon: <FaLinkedinIn />, label: "LinkedIn", href: "https://linkedin.com" },
    { icon: <FaYoutube />, label: "YouTube", href: "https://youtube.com" },
  ],
};

const LinkColumn = ({ column }) => (
  <div className={styles.linkColumn}>
    <h4>{column.title}</h4>
    <ul>
      {column.links.map((link, index) => (
        <li key={index}>
          <motion.a
            href={link.href}
            whileHover={{ x: 5, color: "#A8DADC" }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            {link.text}
          </motion.a>
        </li>
      ))}
    </ul>
  </div>
);

const FooterLinks = () => {
  const handleSubscribe = (e) => {
    e.preventDefault();
    // Handle subscription logic
  };

  return (
    <section className={styles.section}>
      <div className={styles.grid}>
        {/* Brand Column */}
        <div className={styles.brandColumn}>
          <div className={styles.logo}>{footerData.brand.name}</div>
          <p className={styles.description}>{footerData.brand.description}</p>
          <div className={styles.socialLinks}>
            {footerData.socialLinks.map((social, index) => (
              <motion.a
                key={index}
                href={social.href}
                aria-label={social.label}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ y: -5, color: "#A8DADC" }}
              >
                {social.icon}
              </motion.a>
            ))}
          </div>
        </div>

        {/* Link Columns */}
        {footerData.columns.map((column, index) => (
          <LinkColumn key={index} column={column} />
        ))}

        {/* Newsletter Column */}
        <div className={styles.newsletterColumn}>
          <h4>Stay Updated</h4>
          <p>Subscribe for dental tips and exclusive offers</p>
          <form className={styles.form} onSubmit={handleSubscribe}>
            <input
              type="email"
              placeholder="Your email address"
              className={styles.input}
              required
            />
            <motion.button
              type="submit"
              className={styles.button}
              whileHover={{ backgroundColor: "#1a3a5f" }}
            >
              Subscribe
            </motion.button>
          </form>
          <p className={styles.disclaimer}>
            By subscribing, you agree to our Privacy Policy and consent to
            receive updates.
          </p>
        </div>
      </div>
    </section>
  );
};

export default FooterLinks;
