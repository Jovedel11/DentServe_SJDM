import { FaQuoteLeft, FaStar } from "react-icons/fa";
import { testimonials } from "@/data/home_data/homeData";
import { useNavigate } from "react-router-dom";
import styles from "../../style/components/home_styles/Testimonials.module.scss";

const StarRating = ({ rating }) => (
  <div className={styles.rating}>
    {[...Array(5)].map((_, i) => (
      <FaStar
        key={i}
        className={`${styles.star} ${
          i < rating ? styles.filled : styles.empty
        }`}
      />
    ))}
  </div>
);

const Testimonials = () => {
  const navigate = useNavigate();
  const handleShareExperience = async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    navigate("/signup");
  };

  return (
    <section className={styles.testimonials}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>
            Hear From Our <span>Satisfied Patients</span>
          </h2>
          <p>
            Discover why thousands trust us for their dental care needs. These
            are real experiences from our valued community members.
          </p>
          <div className={styles.ratingSummary}>
            <StarRating rating={5} />
            <span>4.9/5 (1,200+ reviews)</span>
          </div>
        </div>

        <div className={styles.grid}>
          {testimonials.map((testimonial, index) => (
            <div key={index} className={styles.card}>
              <FaQuoteLeft className={styles.quote} />
              <StarRating rating={testimonial.stars} />
              <blockquote>
                <p>{testimonial.quote}</p>
              </blockquote>
              <div className={styles.author}>
                <img
                  src={testimonial.image}
                  alt={testimonial.author}
                  className={styles.avatar}
                  loading="lazy"
                />
                <div className={styles.details}>
                  <h4>{testimonial.author}</h4>
                  <p>{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.buttonWrapper}>
          <button className={styles.button} onClick={handleShareExperience}>
            Want to share your experience?
            <FaStar className={styles.icon} />
          </button>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
