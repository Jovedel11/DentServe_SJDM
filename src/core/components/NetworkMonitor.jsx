import { useEffect, useState, createContext, useContext } from "react";

const NetworkContext = createContext();

export const useNetworkStatus = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    return {
      isOnline: navigator.onLine,
      wasOffline: false,
      connectionQuality: "unknown",
      isSlowConnection: false,
      isFastConnection: false,
    };
  }
  return context;
};

export const NetworkMonitor = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState("unknown");

  useEffect(() => {
    const updateOnlineStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);

      if (online && wasOffline) {
        setWasOffline(false);
        console.log("✅ Connection restored");

        // Restore normal styles when back online
        handleOnlineStyles();

        window.dispatchEvent(new CustomEvent("connection-restored"));
      } else if (!online) {
        setWasOffline(true);
        console.log("❌ Connection lost");

        // Apply offline-safe styles
        handleOfflineStyles();

        window.dispatchEvent(new CustomEvent("connection-lost"));
      }
    };

    const handleOfflineStyles = () => {
      const body = document.body;

      // Add offline mode class
      body.classList.add("offline-mode");

      // Preserve current theme state
      const isDark = body.classList.contains("dark");
      const isPublic = body.classList.contains("public-styles");
      const isPrivate = body.classList.contains("private-styles");

      // Store theme information as data attributes for offline preservation
      body.setAttribute("data-offline-theme", isDark ? "dark" : "light");
      body.setAttribute("data-offline-mode", isPublic ? "public" : "private");

      // Force critical styles to be inline for offline reliability
      if (isPublic) {
        body.style.setProperty("background-color", "#F1FAEE", "important");
        body.style.setProperty("color", "#2D3748", "important");
      } else if (isPrivate) {
        if (isDark) {
          body.style.setProperty("background-color", "#1D3557", "important");
          body.style.setProperty("color", "#F1FAEE", "important");
        } else {
          body.style.setProperty("background-color", "#F1FAEE", "important");
          body.style.setProperty("color", "#1A202C", "important");
        }
      }

      console.log("🎨 Offline styles applied");
    };

    const handleOnlineStyles = () => {
      const body = document.body;

      // Remove offline mode class
      body.classList.remove("offline-mode");

      // Remove inline styles to restore normal CSS behavior
      body.style.removeProperty("background-color");
      body.style.removeProperty("color");

      // Clean up data attributes
      body.removeAttribute("data-offline-theme");
      body.removeAttribute("data-offline-mode");

      console.log("🎨 Online styles restored");
    };

    const detectConnectionQuality = () => {
      if ("connection" in navigator) {
        const connection =
          navigator.connection ||
          navigator.mozConnection ||
          navigator.webkitConnection;
        if (connection) {
          setConnectionQuality(connection.effectiveType || "unknown");
        }
      }
    };

    // Event listeners
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    // Initial setup
    updateOnlineStatus();
    detectConnectionQuality();

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, [wasOffline]);

  const value = {
    isOnline,
    wasOffline,
    connectionQuality,
    isSlowConnection:
      connectionQuality === "slow-2g" || connectionQuality === "2g",
    isFastConnection: connectionQuality === "4g",
  };

  return (
    <NetworkContext.Provider value={value}>
      {/* Enhanced offline notification with preserved styling */}
      {!isOnline && (
        <div
          className="fixed top-0 left-0 right-0 z-50"
          style={{
            backgroundColor: "#EF4444",
            color: "#FFFFFF",
            textAlign: "center",
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            fontWeight: "500",
            boxShadow:
              "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
          >
            <svg
              style={{
                width: "1.25rem",
                height: "1.25rem",
                animation: "pulse 2s infinite",
              }}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>You're offline - Content cached for viewing</span>
          </div>
        </div>
      )}

      {/* Slow connection warning */}
      {isOnline && value.isSlowConnection && (
        <div
          className="fixed top-0 left-0 right-0 z-40"
          style={{
            backgroundColor: "#F59E0B",
            color: "#FFFFFF",
            textAlign: "center",
            padding: "0.375rem 1rem",
            fontSize: "0.75rem",
          }}
        >
          <span>Slow connection detected - Please be patient</span>
        </div>
      )}

      {/* Main content with appropriate padding */}
      <div
        style={{
          paddingTop: !isOnline
            ? "3rem"
            : value.isSlowConnection
            ? "2.5rem"
            : "0",
        }}
      >
        {children}
      </div>
    </NetworkContext.Provider>
  );
};
