import { useState, useRef, useCallback, useEffect } from "react";
import { LazyMotion, domAnimation } from "framer-motion";
import HowItWorksSection from "../../../core/components/footer/HowItWorksSection";
import SignUpSection from "../../../core/components/footer/SignupSection";
import FooterLinks from "../../../core/components/footer/FooterLinks";
import CopyrightSection from "../../../core/components/footer/CopyrightSection";
import ToothCharacter from "../../../core/components/footer/ToothCharacter";
import styles from "../style/components/Footer.module.scss";

const Footer = () => {
  const [toothPosition, setToothPosition] = useState({ x: 0, y: 0 });
  const [showTooth, setShowTooth] = useState(false);
  const footerRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    if (!footerRef.current) return;

    const rect = footerRef.current.getBoundingClientRect();
    setToothPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setShowTooth(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setShowTooth(false);
  }, []);

  useEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;

    footer.addEventListener("mousemove", handleMouseMove);
    footer.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      footer.removeEventListener("mousemove", handleMouseMove);
      footer.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [handleMouseMove, handleMouseLeave]);

  return (
    <LazyMotion features={domAnimation}>
      <footer className={styles.footer} ref={footerRef} role="contentinfo">
        {showTooth && <ToothCharacter position={toothPosition} />}
        <HowItWorksSection />
        <SignUpSection />
        <FooterLinks />
        <CopyrightSection />
      </footer>
    </LazyMotion>
  );
};

export default Footer;
