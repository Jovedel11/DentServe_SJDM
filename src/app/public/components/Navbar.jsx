import { motion, AnimatePresence } from "framer-motion";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import styles from "../../public/style/components/Navbar.module.scss";
import { useMediaQuery } from "react-responsive";
import { navLinks, dropdownItems } from "../../../data/navPath";

const DesktopNavLinks = ({ location }) => (
  <>
    {navLinks.map((link) => (
      <NavLink
        key={link.path}
        to={link.path}
        className={({ isActive }) =>
          `${styles.navbar__link} ${isActive ? styles.navbar__linkActive : ""}`
        }
        aria-current={link.path === location.pathname ? "page" : undefined}
      >
        {({ isActive }) => (
          <>
            {link.label}
            {isActive && (
              <motion.div
                layoutId="activeIndicator"
                className={styles.activeIndicator}
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </>
        )}
      </NavLink>
    ))}
  </>
);

const DropdownMenu = ({ isDropdownOpen }) => (
  <AnimatePresence>
    {isDropdownOpen && (
      <motion.div
        className={styles.navbar__dropdownMenu}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        aria-hidden={!isDropdownOpen}
        role="menu"
      >
        {dropdownItems.map((item) => (
          <motion.div
            key={item.path}
            whileHover={{ x: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
            role="menuitem"
          >
            <Link
              to={item.path}
              className={styles.navbar__dropdownLink}
              tabIndex={isDropdownOpen ? 0 : -1}
              role="menuitem"
            >
              {item.label}
            </Link>
          </motion.div>
        ))}
      </motion.div>
    )}
  </AnimatePresence>
);

const MobileMenu = ({
  isMobileMenuOpen,
  toggleMobileMenu,
  isDropdownOpen,
  toggleDropdown,
  location,
}) => (
  <AnimatePresence>
    {isMobileMenuOpen && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={styles.mobileMenuOverlay}
          onClick={toggleMobileMenu}
          role="presentation"
        />

        <motion.nav
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className={styles.navbar__mobile}
          aria-label="Mobile navigation"
          onClick={(e) => e.stopPropagation()}
          id="mobile-menu"
        >
          <div className={styles.mobileHeader}>
            <button
              className={styles.closeButton}
              onClick={toggleMobileMenu}
              aria-label="Close menu"
            >
              <RxCross1 />
            </button>
          </div>

          <div className={styles.mobileNavContent}>
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) =>
                  `${styles.navbar__mobileLink} ${
                    isActive ? styles.navbar__mobileLinkActive : ""
                  }`
                }
                onClick={toggleMobileMenu}
                aria-current={
                  link.path === location.pathname ? "page" : undefined
                }
              >
                {link.label}
                {({ isActive }) =>
                  isActive && (
                    <motion.div
                      layoutId="mobileActiveIndicator"
                      className={styles.activeIndicator}
                    />
                  )
                }
              </NavLink>
            ))}

            <div className={styles.mobileDropdown}>
              <button
                className={`${styles.mobileDropdownButton} ${
                  isDropdownOpen ? styles.dropdownOpen : ""
                }`}
                onClick={toggleDropdown}
                aria-expanded={isDropdownOpen}
                aria-controls="mobile-dropdown-menu"
              >
                More Links
                <motion.span
                  animate={{ rotate: isDropdownOpen ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  aria-hidden="true"
                >
                  <RxChevronDown />
                </motion.span>
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className={styles.mobileDropdownMenu}
                    id="mobile-dropdown-menu"
                    role="menu"
                  >
                    {dropdownItems.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={styles.mobileDropdownLink}
                        onClick={toggleMobileMenu}
                        role="menuitem"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.nav>
      </>
    )}
  </AnimatePresence>
);

const Navbar = React.memo(function Navbar() {
  const [isMobileMenuOpen, setisMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const dropdownRef = useRef(null);
  const isMobile = useMediaQuery({ maxWidth: 768 });

  // detect for scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // close dropdown when clicking in outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contians(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // close menu when route change
  useEffect(() => {
    setisMobileMenuOpen(false);
    setIsDropdownOpen(false);
  }, [location]);

  // close dronwdown when esc key clicked
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        setIsDropdownOpen(false);
        isMobileMenuOpen && setisMobileMenuOpen(false);
      }

      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    };
  }, [isMobileMenuOpen]);

  // mobile menu toggle w/ scroll locking
  const toggleMovileMenu = useCallback(() => {
    setisMobileMenuOpen((prev) => {
      const newState = !prev;
      newState
        ? (document.body.style.overflow = "hidden")
        : (document.body.style.overflow = "");
      return newState;
    });
    setIsDropdownOpen(false);
  }, []);

  const toggleDropdown = useCallback(() => {
    setIsDropdownOpen((prev) => !prev);
  }, []);

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 20 }}
      className={`${styles.navbar} ${isScrolled ? styles.scrolled : ""}`}
      role="banner"
    >
      <div className={styles.navbar__container}>
        {/* Mobile Menu Toggle */}
        <motion.button
          className={styles.navbar__toggle}
          onClick={toggleMobileMenu}
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMobileMenuOpen}
          whileTap={{ scale: 0.95 }}
        >
          {isMobileMenuOpen ? (
            <RxCross1 className={styles.menuIcon} aria-hidden="true" />
          ) : (
            <RxHamburgerMenu className={styles.menuIcon} aria-hidden="true" />
          )}
        </motion.button>

        {/* Desktop Navigation */}
        <nav className={styles.navbar__center} aria-label="Main navigation">
          <DesktopNavLinks location={location} />

          {/* Dropdown Menu */}
          <div
            ref={dropdownRef}
            className={styles.navbar__dropdown}
            onMouseEnter={() => !isMobile && setIsDropdownOpen(true)}
            onMouseLeave={() => !isMobile && setIsDropdownOpen(false)}
          >
            <motion.button
              className={`${styles.navbar__dropdownButton} ${
                isDropdownOpen ? styles.dropdownOpen : ""
              }`}
              onClick={toggleDropdown}
              aria-haspopup="true"
              aria-expanded={isDropdownOpen}
              whileHover={{ backgroundColor: "#f0f9ff" }}
              aria-controls="dropdown-menu"
            >
              More Links
              <motion.span
                className={styles.navbar__dropdownIcon}
                animate={{ rotate: isDropdownOpen ? 180 : 0 }}
                transition={{ duration: 0.3 }}
                aria-hidden="true"
              >
                <RxChevronDown />
              </motion.span>
            </motion.button>
            <DropdownMenu isDropdownOpen={isDropdownOpen} />
          </div>
        </nav>

        {/* Mobile Menu */}
        <MobileMenu
          isMobileMenuOpen={isMobileMenuOpen}
          toggleMobileMenu={toggleMobileMenu}
          isDropdownOpen={isDropdownOpen}
          toggleDropdown={toggleDropdown}
          location={location}
        />
      </div>
    </motion.header>
  );
});

export default Navbar;
