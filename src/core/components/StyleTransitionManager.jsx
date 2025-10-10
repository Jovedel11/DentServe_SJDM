import { useEffect, useRef } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import { useLocation } from "react-router-dom";

export const StyleTransitionManager = ({ children }) => {
  const { user, userRole, isInitialized } = useAuth();
  const location = useLocation();
  const lastState = useRef({ user: null, userRole: null });
  const isTransitioning = useRef(false);
  const isMountedRef = useRef(true);

  // ✅ PRODUCTION: Track applied styles to prevent flicker
  const currentStylesRef = useRef(new Set());

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isInitialized || !isMountedRef.current) return;

    const currentState = { user: !!user, userRole };

    // Check if significant change occurred
    const hasChange =
      lastState.current.user !== currentState.user ||
      lastState.current.userRole !== currentState.userRole;

    if (hasChange && !isTransitioning.current) {
      isTransitioning.current = true;

      // ✅ PRODUCTION: Use requestAnimationFrame for smooth transitions
      requestAnimationFrame(() => {
        if (!isMountedRef.current) return;
        applyStyles(currentState);

        setTimeout(() => {
          isTransitioning.current = false;
        }, 300);
      });
    }

    lastState.current = currentState;
  }, [user, userRole, isInitialized]);

  const applyStyles = (state) => {
    if (!isMountedRef.current) return;

    const body = document.body;

    // ✅ PRODUCTION: Build new class set
    const newClasses = new Set();

    if (!state.user) {
      // Public page - no theme classes
      // PublicStyle component handles public-page class
    } else {
      // Private page
      body.classList.remove("public-page");
      newClasses.add("private-styles");

      if (state.userRole) {
        newClasses.add(`${state.userRole}-theme`);
      }
    }

    // ✅ PRODUCTION: Only update if classes actually changed
    const classesToRemove = [
      "private-styles",
      "patient-theme",
      "staff-theme",
      "admin-theme",
    ];

    // Remove old classes
    classesToRemove.forEach((cls) => {
      if (!newClasses.has(cls)) {
        body.classList.remove(cls);
      }
    });

    // Add new classes
    newClasses.forEach((cls) => {
      body.classList.add(cls);
    });

    // Update current styles
    currentStylesRef.current = newClasses;

    // Clean up Tailwind interference for public pages
    if (!state.user) {
      body.style.removeProperty("--tw-bg-opacity");
      body.style.removeProperty("background-color");
    }
  };

  return children;
};
