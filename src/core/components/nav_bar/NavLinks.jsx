import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { navLinks } from "../../../data/navPath";
import styles from "./NavLinks.module.scss";

const NavLinks = ({ isMobile = false, onLinkClick }) => {
  const location = useLocation();

  return (
    <>
      {navLinks.map((link) => (
        <NavLink
          key={link.path}
          to={link.path}
          className={({ isActive }) =>
            `${isMobile ? styles.mobileLink : styles.desktopLink} ${
              isActive ? styles.activeLink : ""
            }`
          }
          onClick={onLinkClick}
          aria-current={link.path === location.pathname ? "page" : undefined}
        >
          {link.label}
          {link.path === location.pathname && (
            <div className={styles.activeIndicator} />
          )}
        </NavLink>
      ))}
    </>
  );
};

export default NavLinks;
