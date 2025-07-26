import React from "react";
import { motion } from "framer-motion";
import { FaQuoteLeft, FaStar } from "react-icons/fa";
import styles from "../style/components/Testimonials.module.scss";

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
  const testimonials = [
    {
      quote:
        "Booking has never been this easy! The clinic matching system found me the perfect dentist in minutes.",
      author: "Maria Dela Cruz",
      role: "Freelance Designer",
      stars: 5,
      image:
        "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80",
    },
    {
      quote:
        "As a senior citizen, I appreciate how user-friendly the platform is. Got my dental check-up booked without any hassle!",
      author: "Ricardo Santos",
      role: "Retired Teacher",
      stars: 4,
      image:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80",
    },
    {
      quote:
        "Our clinic saw a 40% increase in new patients after joining the platform. The management tools are fantastic!",
      author: "Dr. Andrea Lim",
      role: "Dental Clinic Owner",
      stars: 5,
      image:
        "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80",
    },
  ];

  return (
    <section className={styles.testimonials}>
      <div className={styles.container}>
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
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
        </motion.div>

        <div className={styles.grid}>
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              className={styles.card}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
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
            </motion.div>
          ))}
        </div>

        <motion.div
          className={styles.buttonWrapper}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
        >
          <button className={styles.button}>
            Read More Testimonials
            <FaStar className={styles.icon} />
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;
