import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { Phone, Mail, MapPin, Calendar } from "lucide-react";

import styles from "../style/pages/Contact.module.scss";
import PartnershipForm from "../components/contact_components/PartnershipForm";
import MapSection from "../components/contact_components/MapSection";
import { benefits } from "../../../core/common/icons/contactIcons";

const Contact = () => {
  const location = useLocation();
  const formRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm();

  // Hero loading effect
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Form submission handler
  const onSubmit = useCallback(
    async (data) => {
      setIsSubmitting(true);
      try {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          if (key === "documents") {
            Array.from(value).forEach((file) => {
              formData.append("documents", file);
            });
          } else if (key === "services") {
            value.forEach((service) => {
              formData.append("services", service);
            });
          } else {
            formData.append(key, value);
          }
        });

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1500));
        console.log("Form data:", Object.fromEntries(formData));

        toast.success("Application submitted successfully!");
        reset();
        setValue("documents", null);
      } catch (error) {
        toast.error(error.message || "Failed to submit application");
      } finally {
        setIsSubmitting(false);
      }
    },
    [reset, setValue]
  );

  // Scroll handler for form section
  const handleHashScroll = useCallback(() => {
    if (location.hash === "#agreement" && formRef.current) {
      const yOffset = -100;
      const y =
        formRef.current.getBoundingClientRect().top + window.scrollY + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  }, [location.hash]);

  useEffect(() => {
    handleHashScroll();
    window.addEventListener("hashchange", handleHashScroll);
    return () => window.removeEventListener("hashchange", handleHashScroll);
  }, [handleHashScroll]);

  // Contact items data
  const contactItems = [
    {
      icon: <Phone className={styles.contactIcon} />,
      title: "Phone Support",
      content: "(+63) 912 345 6789",
      sub: "Mon-Fri: 8AM - 5PM",
    },
    {
      icon: <Mail className={styles.contactIcon} />,
      title: "Email Us",
      content: "support@san-josedental.com",
      sub: "Response within 24hrs",
    },
    {
      icon: <MapPin className={styles.contactIcon} />,
      title: "Office Address",
      content: "123 Dental Ave, San Jose City",
      sub: "San Jose DelMonte City, Bulacan",
    },
  ];

  if (isLoading) {
    return (
      <div className={styles.contactsPage}>
        <div className={styles.skeleton} style={{ height: "400px" }}></div>
      </div>
    );
  }

  return (
    <div className={styles.contactsPage}>
      {/* Hero Section */}
      <section className={styles.contactHero}>
        <div className={styles.heroContainer}>
          <h1>Connect With Our Dental Network</h1>
          <p className={styles.heroSubtext}>
            Partner with the leading dental care platform in San Jose Del Monte Bulacan.
            Whether you're a patient or practitioner, we're here to elevate
            dental care experiences.
          </p>
        </div>
      </section>

      {/* Contact Cards */}
      <div className={styles.contactCardsGrid}>
        {contactItems.map((item, index) => (
          <div key={item.title} className={styles.contactCard}>
            <div className={styles.cardContent}>
              {item.icon}
              <h3>{item.title}</h3>
              <p className={styles.cardMainText}>{item.content}</p>
              <p className={styles.cardSubText}>{item.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Benefits Section */}
      <section className={styles.benefitsSection}>
        <h3>Why Partner With Us?</h3>
        <div className={styles.benefitsGrid}>
          {benefits.map((benefit, index) => (
            <div key={benefit.title} className={styles.benefitCard}>
              <div className={styles.benefitIcon}>{benefit.icon}</div>
              <h4>{benefit.title}</h4>
              <p>{benefit.content}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Partnership Form */}
      <PartnershipForm
        ref={formRef}
        register={register}
        errors={errors}
        handleSubmit={handleSubmit}
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
        setValue={setValue}
      />

      {/* Map Section */}
      <MapSection />

      {/* Patient Section */}
      <section className={styles.patientSection}>
        <div className={styles.patientContainer}>
          <div className={styles.patientForm}>
            <h3>Patient Inquiry Form</h3>
            <p>Have questions? Our team will get back to you within 24 hours</p>

            <form className={styles.patientFormContent}>
              <div className={styles.formGroup}>
                <div className={styles.formField}>
                  <label htmlFor="patientName">Full Name</label>
                  <input
                    id="patientName"
                    type="text"
                    placeholder="Your full name"
                  />
                </div>
                <div className={styles.formField}>
                  <label htmlFor="patientEmail">Email Address</label>
                  <input
                    id="patientEmail"
                    type="email"
                    placeholder="your.email@example.com"
                  />
                </div>
              </div>

              <div className={styles.formField}>
                <label htmlFor="patientPhone">Phone Number</label>
                <input
                  id="patientPhone"
                  type="tel"
                  placeholder="(123) 456-7890"
                />
              </div>

              <div className={styles.formField}>
                <label htmlFor="patientMessage">Message</label>
                <textarea
                  id="patientMessage"
                  placeholder="How can we help you?"
                  rows="4"
                ></textarea>
              </div>

              <button type="submit" className={styles.submitButton}>
                Send Inquiry
              </button>
            </form>
          </div>

          <div className={styles.patientInfo}>
            <h3>Direct Patient Support</h3>
            <div className={styles.supportOptions}>
              <div className={styles.supportCard}>
                <Phone />
                <div>
                  <h4>Phone Support</h4>
                  <p>(+63) 912 345 6789</p>
                </div>
              </div>
              <div className={styles.supportCard}>
                <Mail />
                <div>
                  <h4>Email Support</h4>
                  <p>patients@san-josedental.com</p>
                </div>
              </div>
              <div className={styles.supportCard}>
                <Calendar />
                <div>
                  <h4>Appointment Booking</h4>
                  <p>Available 24/7 through our online portal</p>
                </div>
              </div>
            </div>

            <div className={styles.emergencyInfo}>
              <h4>Dental Emergency?</h4>
              <p>
                For urgent dental issues outside business hours, please call our
                emergency line:
              </p>
              <p className={styles.emergencyNumber}>(+63) 917 890 1234</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
