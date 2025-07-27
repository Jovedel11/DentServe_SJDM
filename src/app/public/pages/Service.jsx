import { useState } from "react";
import ServicesHero from "../components/service_components/ServicesHero";
import ServiceCard from "../components/service_components/ServiceCard";
import {
  serviceCategories,
  dentalServices,
} from "../../../core/common/icons/serviceIcon";
import { FaSearch } from "react-icons/fa";
import styles from "../style/pages/Service.module.scss";

const Services = () => {
  const [activeCategory, setActiveCategory] = useState("all");
  const [expandedService, setExpandedService] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // filtering logic
  const getFilteredServices = () => {
    let filtered = dentalServices;

    if (activeCategory !== "all") {
      filtered = filtered.filter(
        (service) => service.category === activeCategory
      );
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (service) =>
          service.title.toLowerCase().includes(search) ||
          service.description.toLowerCase().includes(search)
      );
    }

    return filtered;
  };

  const filteredServices = getFilteredServices();

  const toggleServiceDetails = (id) => {
    setExpandedService(expandedService === id ? null : id);
  };

  // search component
  const SearchBox = () => (
    <div className={styles.searchContainer}>
      <div className={styles.searchBox}>
        <FaSearch className={styles.searchIcon} />
        <input
          type="text"
          placeholder="Search services..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
    </div>
  );

  // category filter
  const CategoryFilter = () => (
    <div className={styles.categoryFilters}>
      <button
        className={`${styles.filterButton} ${
          activeCategory === "all" ? styles.active : ""
        }`}
        onClick={() => setActiveCategory("all")}
      >
        All Services
      </button>
      {serviceCategories.map((category) => (
        <button
          key={category.id}
          className={`${styles.filterButton} ${
            activeCategory === category.id ? styles.active : ""
          }`}
          onClick={() => setActiveCategory(category.id)}
        >
          {category.icon} {category.name}
        </button>
      ))}
    </div>
  );

  // CTA section
  const CTASection = () => (
    <section className={styles.ctaSection}>
      <div className={styles.ctaContent}>
        <h2>Experience Exceptional Dental Care</h2>
        <p>
          Create an account to book appointments and track your dental history
        </p>
        <button className={styles.ctaButton}>Sign Up Now</button>
      </div>
    </section>
  );

  return (
    <div className={styles.servicesPage}>
      <ServicesHero />

      <section className={styles.servicesSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.servicesTitle}>Our Dental Services</h2>
          <p className={styles.servicesDescription}>
            Comprehensive dental care services delivered by experienced
            professionals
          </p>
        </div>

        <SearchBox />
        <CategoryFilter />

        <div className={styles.servicesGrid}>
          {filteredServices.length > 0 ? (
            filteredServices.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                expandedService={expandedService}
                toggleServiceDetails={toggleServiceDetails}
              />
            ))
          ) : (
            <div className={styles.noResults}>
              <h3>No services found</h3>
              <p>Try adjusting your search or filter criteria</p>
            </div>
          )}
        </div>
      </section>

      <CTASection />
    </div>
  );
};

export default Services;
