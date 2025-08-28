import { useEffect, useRef } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import { useLocation } from "react-router-dom";

export const StyleTransitionManager = ({ children }) => {
  const { user, userRole, isInitialized } = useAuth();
  const location = useLocation();
  const lastState = useRef({ user: null, userRole: null });
  const isTransitioning = useRef(false);

  useEffect(() => {
    if (!isInitialized) return;

    const currentState = { user: !!user, userRole };

    // Check if significant change occurred
    const hasChange =
      lastState.current.user !== currentState.user ||
      lastState.current.userRole !== currentState.userRole;

    if (hasChange && !isTransitioning.current) {
      isTransitioning.current = true;

      // Apply styles immediately
      applyStyles(currentState);

      // Reset transition flag
      setTimeout(() => {
        isTransitioning.current = false;
      }, 300);
    }

    lastState.current = currentState;
  }, [user, userRole, isInitialized]);

  const applyStyles = (state) => {
    const body = document.body;

    // Remove all style classes
    body.classList.remove(
      "public-styles",
      "private-styles",
      "patient-theme",
      "staff-theme",
      "admin-theme"
    );

    if (!state.user) {
      body.classList.add("public-styles");
      // Clean up any Tailwind interference
      body.style.removeProperty("--tw-bg-opacity");
      body.style.removeProperty("background-color");
    } else {
      body.classList.add("private-styles");
      if (state.userRole) {
        body.classList.add(`${state.userRole}-theme`);
      }
    }
  };

  return children;
};
