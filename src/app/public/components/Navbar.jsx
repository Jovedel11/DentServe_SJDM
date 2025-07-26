import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { RxHamburgerMenu, RxCross1 } from "react-icons/rx";
import { useMediaQuery } from "react-responsive";

import Logo from "../../../core/components/Logo";
import NavLinks from "../../../core/components/nav_bar/NavLinks";
import Dropdown from "../../../core/components/nav_bar/Dropdown";
import AuthButtons from "../../../core/components/nav_bar/AuthButtons";
import styles from "../style/components/Navbar.module.scss";

// navbar component
const Navbar = React.memo(function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const location = useLocation();
  const dropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const isMobile = useMediaQuery({ maxWidth: 768 });

  // optimized scroll handler with RAF
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 50);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target) &&
        isMobileMenuOpen
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isDropdownOpen || isMobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isDropdownOpen, isMobileMenuOpen]);

  // close menus on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsDropdownOpen(false);
  }, [location.pathname]);

  // keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsDropdownOpen(false);
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // body scroll lock for mobile menu
  useEffect(() => {
    if (isMobileMenuOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";

      return () => {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [isMobileMenuOpen]);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
    setIsDropdownOpen(false);
  }, []);

  const toggleDropdown = useCallback(() => {
    setIsDropdownOpen((prev) => !prev);
  }, []);

  const closeDropdown = useCallback(() => {
    setIsDropdownOpen(false);
  }, []);

  const handleKeyDown = useCallback((e, action) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      action();
    }
  }, []);

  return (
    <header
      className={`${styles.navbar} ${isScrolled ? styles.scrolled : ""}`}
      role="banner"
    >
      <div className={styles.navbarContainer}>
        <Logo />

        {/* Mobile Menu Toggle */}
        <button
          className={styles.navbarToggle}
          onClick={toggleMobileMenu}
          onKeyDown={(e) => handleKeyDown(e, toggleMobileMenu)}
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-menu"
        >
          {isMobileMenuOpen ? (
            <RxCross1 className={styles.menuIcon} aria-hidden="true" />
          ) : (
            <RxHamburgerMenu className={styles.menuIcon} aria-hidden="true" />
          )}
        </button>

        {/* Desktop Navigation */}
        <nav className={styles.navbarCenter} aria-label="Main navigation">
          <NavLinks />
          <div
            ref={dropdownRef}
            onMouseEnter={() => !isMobile && setIsDropdownOpen(true)}
            onMouseLeave={() => !isMobile && setIsDropdownOpen(false)}
          >
            <Dropdown
              isOpen={isDropdownOpen}
              onToggle={toggleDropdown}
              onClose={closeDropdown}
            />
          </div>
        </nav>

        <AuthButtons />

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <>
            <div
              className={styles.mobileMenuOverlay}
              onClick={toggleMobileMenu}
              role="presentation"
              aria-hidden="true"
            />
            <nav
              ref={mobileMenuRef}
              className={`${styles.navbarMobile} ${
                isMobileMenuOpen ? styles.mobileMenuOpen : ""
              }`}
              aria-label="Mobile navigation"
              id="mobile-menu"
            >
              <div className={styles.mobileHeader}>
                <Logo />
                <button
                  className={styles.closeButton}
                  onClick={toggleMobileMenu}
                  aria-label="Close menu"
                >
                  <RxCross1 />
                </button>
              </div>

              <div className={styles.mobileNavContent}>
                <div className={styles.mobileNavLinks}>
                  <NavLinks isMobile onLinkClick={toggleMobileMenu} />
                </div>

                <Dropdown
                  isOpen={isDropdownOpen}
                  onToggle={toggleDropdown}
                  onClose={closeDropdown}
                  isMobile
                  onItemClick={toggleMobileMenu}
                />

                <AuthButtons isMobile onButtonClick={toggleMobileMenu} />
              </div>
            </nav>
          </>
        )}
      </div>
    </header>
  );
});

export default Navbar;
