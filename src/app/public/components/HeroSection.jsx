import { motion } from "framer-motion";
import React, { useEffect, useState, useRef, useCallback } from "react";
import Skeleton from "../../../core/components/Skeleton";
import styles from "../style/components/HeroSection.module.scss";

const HeroSection = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const sliderInterval = useRef(null);

  const slides = [
    "/assets/images/smiling.png",
    "/assets/images/child.png",
    "/assets/images/smile.png",
  ];

  const goToSlide = useCallback((index) => {
    setCurrentSlide(index);
    resetInterval();
  }, []);

  const resetInterval = useCallback(() => {
    clearInterval(sliderInterval.current);
    sliderInterval.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
  }, [slides.length]);

  useEffect(() => {
    resetInterval();
    return () => clearInterval(sliderInterval.current);
  }, [resetInterval]);

  useEffect(() => {
    const preloadImages = () => {
      slides.forEach((src) => {
        const img = new Image();
        img.src = src;
      });
    };

    const timer = setTimeout(() => {
      setIsLoading(false);
      preloadImages();
    }, 600);

    return () => clearTimeout(timer);
  }, [slides]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") {
        goToSlide((currentSlide - 1 + slides.length) % slides.length);
      } else if (e.key === "ArrowRight") {
        goToSlide((currentSlide + 1) % slides.length);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentSlide, goToSlide, slides.length]);

  if (isLoading) {
    return <Skeleton height="clamp(300px, 40vw, 500px)" />;
  }

  return (
    <section id="hero" className={styles.heroSection} aria-label="Hero Section">
      <div className={styles.container}>
        <div className={styles.textColumns}>
          <motion.div
            className={styles.leftColumn}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className={styles.heading}>
              Your Smile Deserves{" "}
              <span className={styles.highlight}>the Best Care</span>
            </h1>
            <div className={styles.buttonGroup}>
              <button
                className={`${styles.button} ${styles.primaryButton}`}
                aria-label="Book an appointment"
              >
                Book Appointment
              </button>
              <button
                className={`${styles.button} ${styles.secondaryButton}`}
                aria-label="Learn more about our services"
              >
                Learn More
              </button>
            </div>
          </motion.div>

          <motion.div
            className={styles.rightColumn}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <p className={styles.paragraph}>
              Welcome to our dental practice, where your comfort and health are
              our top priorities. Experience seamless appointment scheduling and
              exceptional care tailored just for you.
            </p>
          </motion.div>
        </div>

        <div className={styles.sliderWrapper}>
          <div
            className={styles.sliderContainer}
            role="region"
            aria-label="Image carousel"
            aria-roledescription="carousel"
            aria-live="polite"
          >
            <div
              className={styles.sliderTrack}
              style={{
                transform: `translate3d(-${currentSlide * 100}%, 0, 0)`,
              }}
            >
              {slides.map((slide, index) => (
                <div
                  key={index}
                  className={styles.slide}
                  aria-hidden={index !== currentSlide}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`Slide ${index + 1} of ${slides.length}`}
                >
                  <img
                    src={slide}
                    className={styles.image}
                    alt={`Dental care ${index + 1}`}
                    loading={index === 0 ? "eager" : "lazy"}
                    decoding="async"
                  />
                </div>
              ))}
            </div>

            <div className={styles.slideIndicators}>
              {slides.map((_, index) => (
                <button
                  key={index}
                  className={`${styles.indicator} ${
                    index === currentSlide ? styles.active : ""
                  }`}
                  onClick={() => goToSlide(index)}
                  aria-label={`Go to slide ${index + 1}`}
                  aria-current={index === currentSlide}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default React.memo(HeroSection);
