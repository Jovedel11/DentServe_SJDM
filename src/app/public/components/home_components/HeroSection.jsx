import React, { useEffect, useState, useRef, useCallback } from "react";
import Skeleton from "../../../../core/components/Skeleton";
import { slides } from "../../../../data/home_data/homeData";
import styles from "../../style/components/home_styles/HeroSection.module.scss";
import Loader from "../../../../core/components/Loader";

const HeroSection = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const sliderInterval = useRef(null);
  const containerRef = useRef(null);

  const goToSlide = useCallback(
    (index) => {
      if (index >= 0 && index < slides.length) {
        setCurrentSlide(index);
        resetInterval();
      }
    },
    [slides.length]
  );
  // reset the slider interval to auto-advance slides
  const resetInterval = useCallback(() => {
    if (sliderInterval.current) {
      clearInterval(sliderInterval.current);
    }
    sliderInterval.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);
  }, [slides.length]);

  // preload images to avoid flickering
  const preloadImages = useCallback(() => {
    slides.forEach(({ src }) => {
      const img = new Image();
      img.src = src;
    });
  }, [slides]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      preloadImages();
      resetInterval();
    }, 300);

    return () => {
      clearTimeout(timer);
      if (sliderInterval.current) {
        clearInterval(sliderInterval.current);
      }
    };
  }, [preloadImages, resetInterval]);

  // handle keyboard navigation and visibility changes
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") {
        goToSlide((currentSlide - 1 + slides.length) % slides.length);
      } else if (e.key === "ArrowRight") {
        goToSlide((currentSlide + 1) % slides.length);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (sliderInterval.current) {
          clearInterval(sliderInterval.current);
        }
      } else {
        resetInterval();
      }
    };
    // keyboard navigation and visibility changes
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentSlide, goToSlide, resetInterval, slides.length]);

  if (isLoading) {
    return <Loader type="skeleton" message="Loading hero section..." />;
  }

  return (
    <section
      id="hero"
      className={styles.heroSection}
      aria-label="Welcome to our dental practice"
      ref={containerRef}
    >
      <div className={styles.container}>
        <div className={styles.contentGrid}>
          <div className={styles.textContent}>
            <div className={styles.headingSection}>
              <h1 className={styles.mainHeading}>
                Your Smile Deserves{" "}
                <span className={styles.highlight}>Exceptional Care</span>
              </h1>
              <p className={styles.description}>
                Experience professional dental care in a comfortable, modern
                environment. Our expert team is dedicated to your oral health
                and beautiful smile.
              </p>
            </div>

            <div className={styles.ctaButtons}>
              <button
                className={`${styles.button} ${styles.primary}`}
                type="button"
                aria-label="Schedule your dental appointment"
              >
                Book Appointment
              </button>
              <button
                className={`${styles.button} ${styles.secondary}`}
                type="button"
                aria-label="Learn about our dental services"
              >
                Our Services
              </button>
            </div>
          </div>

          <div className={styles.imageSlider}>
            <div
              className={styles.sliderContainer}
              role="img"
              aria-label={slides[currentSlide].alt}
            >
              <div
                className={styles.sliderTrack}
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                {slides.map((slide, index) => (
                  <div key={index} className={styles.slide}>
                    <img
                      src={slide.src}
                      alt={slide.alt}
                      className={styles.slideImage}
                      loading={index === 0 ? "eager" : "lazy"}
                      decoding="async"
                    />
                  </div>
                ))}
              </div>

              <div className={styles.indicators}>
                {slides.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`${styles.indicator} ${
                      index === currentSlide ? styles.active : ""
                    }`}
                    onClick={() => goToSlide(index)}
                    aria-label={`View slide ${index + 1}`}
                    aria-current={index === currentSlide ? "true" : "false"}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default React.memo(HeroSection);
