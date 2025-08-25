import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { AuthProvider } from "./auth/context/AuthProvider";
import { ThemeProvider } from "./core/contexts/ThemeProvider";
import ErrorBoundary from "./core/components/ErrorFolder/ErrorBoundary";
import { useAuth } from "./auth/context/AuthProvider";
import { useEffect } from "react";
import * as Sentry from "@sentry/react";
import "./core/styles/global.css";

Sentry.init({
  dsn: "https://e9b018cf8a2b73e64f6b93e0d35a048c@o4509898883727360.ingest.us.sentry.io/4509898884775936",
  tracesSampleRate: 1.0,
});

// Style transition manager to handle Sass vs Tailwind smoothly
const StyleTransitionManager = ({ children }) => {
  const { user, userRole, isInitialized } = useAuth();

  useEffect(() => {
    if (!isInitialized) return;

    const body = document.body;

    // Remove any existing style classes
    body.classList.remove(
      "public-styles",
      "private-styles",
      "patient-theme",
      "staff-theme",
      "admin-theme",
      "transitioning-styles"
    );

    // Add transition class for smooth style changes
    body.classList.add("transitioning-styles");

    // Set appropriate styles based on authentication
    if (!user) {
      // Public user - use Sass styles
      body.classList.add("public-styles");

      // Ensure Tailwind doesn't interfere with public styles
      body.style.removeProperty("--tw-bg-opacity");
      body.style.removeProperty("background-color");

      // Apply public-specific CSS properties
      body.style.setProperty("--transition-duration", "0.3s");
    } else {
      // Authenticated user - use Tailwind styles
      body.classList.add("private-styles");

      // Add role-specific theme classes for additional customization
      if (userRole) {
        body.classList.add(`${userRole}-theme`);
      }

      // Apply private-specific CSS properties for Tailwind
      body.style.setProperty("--transition-duration", "0.3s");
    }

    // Remove transition class after animation completes
    const removeTransitionClass = setTimeout(() => {
      body.classList.remove("transitioning-styles");
    }, 300);

    return () => {
      clearTimeout(removeTransitionClass);
    };
  }, [user, userRole, isInitialized]);

  return children;
};

// Global CSS for smooth transitions
const styleElement = document.createElement("style");
styleElement.textContent = `
  body.transitioning-styles {
    transition: all var(--transition-duration, 0.3s) ease;
  }
  
  .public-styles {
    /* Ensure Sass styles take precedence */
    color: inherit !important;
    background-color: inherit !important;
  }
  
  .private-styles {
    /* Ensure Tailwind styles work properly */
    box-sizing: border-box;
  }
  
  /* Prevent style flash during transitions */
  .patient-theme { --primary-color: #06b6d4; }
  .staff-theme { --primary-color: #8b5cf6; }
  .admin-theme { --primary-color: #ef4444; }
`;
document.head.appendChild(styleElement);

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="system" storageKey="dental-theme">
        <AuthProvider>
          <StyleTransitionManager>
            <RouterProvider router={router} />
          </StyleTransitionManager>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
