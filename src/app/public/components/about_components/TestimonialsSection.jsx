import { testimonials } from "../../../../data/about_data/aboutData";
import styles from "../../style/components/about_styles/TestimonialsSection.module.scss";

const TestimonialsSection = () => {
  return (
    <section className={styles.testimonials}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2>Trusted By Patients & Professionals</h2>
          <p>Real experiences from our community</p>
        </div>
        <div className={styles.testimonialsGrid}>
          {testimonials.map((testimonial, index) => (
            <div key={index} className={styles.testimonialCard}>
              <div className={styles.quoteMark}>"</div>
              <p className={styles.quote}>{testimonial.quote}</p>
              <div className={styles.author}>
                <div className={styles.authorName}>{testimonial.author}</div>
                <div className={styles.authorLocation}>
                  {testimonial.location}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
