import { useState, useEffect, useCallback, useRef } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { RxHamburgerMenu, RxCross1 } from "react-icons/rx";
import styles from "../style/components/Navbar.module.scss";
import { navLinks } from "../../../data/home_data/homeData";

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const dropdownRef = useRef(null);

  // scroll detection
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // close menus when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsDropdownOpen(false);
  }, [location]);

  // close dropdown on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        setIsDropdownOpen(false);
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
    setIsDropdownOpen(false);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  return (
    <header className={`${styles.navbar} ${isScrolled ? styles.scrolled : ""}`}>
      <div className={styles.container}>
        {/* Logo */}
        <Link to="/" className={styles.logo} aria-label="DentServe Home">
          <div className={styles.logoContainer}>
            <div className={styles.logoImageWrapper}>
              <img
                src="/assets/images/logo.png"
                alt="DentServe Logo"
                className={styles.logoImage}
                loading="eager"
                width="28"
                height="28"
              />
            </div>
            <span className={styles.logoText}>DentServe</span>
          </div>
        </Link>

        {/* Mobile Menu Toggle */}
        <button
          className={styles.mobileToggle}
          onClick={toggleMobileMenu}
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <RxCross1 /> : <RxHamburgerMenu />}
        </button>

        {/* Desktop Navigation */}
        <nav className={styles.desktopNav} aria-label="Main navigation">
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.active : ""}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Auth Buttons */}
        <div className={styles.authButtons}>
          <Link to="/login">
            <button className={`${styles.btn} ${styles.loginBtn}`}>
              Login
            </button>
          </Link>
          <Link to="/signup">
            <button className={`${styles.btn} ${styles.signupBtn}`}>
              Sign Up
            </button>
          </Link>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <>
            <div className={styles.overlay} onClick={closeMobileMenu} />
            <nav className={styles.mobileNav} aria-label="Mobile navigation">
              <div className={styles.mobileHeader}>
                <Link
                  to="/"
                  className={styles.logo}
                  aria-label="DentServe Home"
                  onClick={closeMobileMenu}
                >
                  <div className={styles.logoContainer}>
                    <div className={styles.logoImageWrapper}>
                      <img
                        src="/assets/images/logo.png"
                        alt="DentServe Logo"
                        className={styles.logoImage}
                        loading="eager"
                        width="28"
                        height="28"
                      />
                    </div>
                    <span className={styles.logoText}>DentServe</span>
                  </div>
                </Link>
                <button className={styles.closeBtn} onClick={closeMobileMenu}>
                  <RxCross1 />
                </button>
              </div>

              <div className={styles.mobileContent}>
                {navLinks.map((link) => (
                  <NavLink
                    key={link.path}
                    to={link.path}
                    className={({ isActive }) =>
                      `${styles.mobileLink} ${isActive ? styles.active : ""}`
                    }
                    onClick={closeMobileMenu}
                  >
                    {link.label}
                  </NavLink>
                ))}

                <div className={styles.mobileAuth}>
                  <Link to="/login">
                    <button
                      className={`${styles.btn} ${styles.mobileBtn}`}
                      onClick={closeMobileMenu}
                    >
                      Login
                    </button>
                  </Link>
                  <Link to="/signup">
                    <button
                      className={`${styles.btn} ${styles.mobileBtn} ${styles.primary}`}
                      onClick={closeMobileMenu}
                    >
                      Sign Up
                    </button>
                  </Link>
                </div>
              </div>
            </nav>
          </>
        )}
      </div>
    </header>
  );
};

export default Navbar;
