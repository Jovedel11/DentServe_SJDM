import {
  FaClock,
  FaMapMarkerAlt,
  FaClinicMedical,
  FaStar,
} from "react-icons/fa";
import styles from "../../style/components/service_styles/ServiceCard.module.scss";

const ServiceCard = ({ service, expandedService, toggleServiceDetails }) => {
  const isExpanded = expandedService === service.id;

  return (
    <div className={styles.serviceCard}>
      <div className={styles.cardTop}>
        <div className={styles.serviceIcon}>{service.icon}</div>
        <div className={styles.serviceContent}>
          <div className={styles.serviceHeader}>
            <h3 className={styles.serviceTitle}>{service.title}</h3>
            {service.popular && (
              <span className={styles.popularBadge}>
                <FaStar /> Popular
              </span>
            )}
          </div>
          <p className={styles.serviceDescription}>{service.description}</p>
        </div>
      </div>

      <div className={styles.serviceMeta}>
        <div className={styles.serviceDuration}>
          <FaClock /> {service.duration}
        </div>
        <div className={styles.serviceLocations}>
          <FaMapMarkerAlt /> {service.locations}+ clinics
        </div>
      </div>

      <div
        className={`${styles.serviceActions} ${
          isExpanded ? styles.expanded : ""
        }`}
        onClick={() => toggleServiceDetails(service.id)}
      >
        {isExpanded ? "Hide Details" : "View Full Details"}
        <FaClinicMedical />
      </div>

      {isExpanded && (
        <div className={styles.expandedDetails}>
          <p>{service.details}</p>
          <div className={styles.benefitsList}>
            <h4>Key Benefits:</h4>
            <ul>
              {service.benefits.map((benefit, index) => (
                <li key={index}>{benefit}</li>
              ))}
            </ul>
          </div>
          <button className={styles.findClinicsButton}>
            <FaMapMarkerAlt /> Find Clinics Offering This Service
          </button>
        </div>
      )}
    </div>
  );
};

export default ServiceCard;
