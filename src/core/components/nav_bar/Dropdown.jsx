import React from "react";
import { Link } from "react-router-dom";
import { RxChevronDown } from "react-icons/rx";
import { dropdownItems } from "../../../data/navPath";
import styles from "./Dropdown.module.scss";

const Dropdown = ({
  isOpen,
  onToggle,
  onClose,
  isMobile = false,
  onItemClick,
}) => {
  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    }
  };

  if (isMobile) {
    return (
      <div className={styles.mobileDropdown}>
        <button
          className={`${styles.mobileDropdownButton} ${
            isOpen ? styles.dropdownOpen : ""
          }`}
          onClick={onToggle}
          onKeyDown={handleKeyDown}
          aria-expanded={isOpen}
          aria-controls="mobile-dropdown-menu"
        >
          More Links
          <span
            className={`${styles.dropdownIcon} ${
              isOpen ? styles.iconRotated : ""
            }`}
            aria-hidden="true"
          >
            <RxChevronDown />
          </span>
        </button>

        {isOpen && (
          <div
            className={styles.mobileDropdownMenu}
            id="mobile-dropdown-menu"
            role="menu"
          >
            {dropdownItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={styles.mobileDropdownLink}
                onClick={onItemClick}
                role="menuitem"
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.dropdown}>
      <button
        className={`${styles.dropdownButton} ${
          isOpen ? styles.dropdownOpen : ""
        }`}
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-controls="dropdown-menu"
      >
        More Links
        <span
          className={`${styles.dropdownIcon} ${
            isOpen ? styles.iconRotated : ""
          }`}
          aria-hidden="true"
        >
          <RxChevronDown />
        </span>
      </button>

      {isOpen && (
        <div className={styles.dropdownMenu} role="menu" id="dropdown-menu">
          {dropdownItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={styles.dropdownLink}
              onClick={onClose}
              role="menuitem"
              tabIndex={0}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dropdown;
