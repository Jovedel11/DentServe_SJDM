import {
  useEffect,
  useState,
  createContext,
  useContext,
  useRef,
  useCallback,
} from "react";

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

  // ✅ FIX: Track mounted state to prevent memory leaks
  const isMountedRef = useRef(true);
  const styleAppliedRef = useRef(false);
  const cleanupTimeoutRef = useRef(null);

  // ✅ PRODUCTION: Memoize style handlers
  const handleOfflineStyles = useCallback(() => {
    if (!isMountedRef.current || styleAppliedRef.current) return;

    const body = document.body;
    body.classList.add("offline-mode");

    const isDark = body.classList.contains("dark");
    const isPublic = body.classList.contains("public-styles");
    const isPrivate = body.classList.contains("private-styles");

    body.setAttribute("data-offline-theme", isDark ? "dark" : "light");
    body.setAttribute("data-offline-mode", isPublic ? "public" : "private");

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

    styleAppliedRef.current = true;
    console.log("🎨 Offline styles applied");
  }, []);

  const handleOnlineStyles = useCallback(() => {
    if (!isMountedRef.current) return;

    const body = document.body;
    body.classList.remove("offline-mode");

    body.style.removeProperty("background-color");
    body.style.removeProperty("color");

    body.removeAttribute("data-offline-theme");
    body.removeAttribute("data-offline-mode");

    styleAppliedRef.current = false;
    console.log("🎨 Online styles restored");
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    const updateOnlineStatus = () => {
      if (!isMountedRef.current) return;

      const online = navigator.onLine;
      setIsOnline(online);

      if (online && wasOffline) {
        setWasOffline(false);
        handleOnlineStyles();

        // ✅ PRODUCTION: Notify other components
        window.dispatchEvent(new CustomEvent("connection-restored"));

        // ✅ PRODUCTION: Auto-retry failed requests (if queue exists)
        if (window.__networkRetryQueue) {
          window.__networkRetryQueue.forEach((fn) => {
            try {
              fn();
            } catch (e) {
              console.error("Retry failed:", e);
            }
          });
          window.__networkRetryQueue = [];
        }
      } else if (!online) {
        setWasOffline(true);
        handleOfflineStyles();
        window.dispatchEvent(new CustomEvent("connection-lost"));
      }
    };

    const detectConnectionQuality = () => {
      if (!isMountedRef.current) return;

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

    // ✅ PRODUCTION: Cleanup function
    return () => {
      isMountedRef.current = false;
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);

      // Clear any pending timeouts
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }

      // Restore styles if component unmounts while offline
      if (styleAppliedRef.current) {
        handleOnlineStyles();
      }
    };
  }, [wasOffline, handleOfflineStyles, handleOnlineStyles]);

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
      {/* Enhanced offline notification */}
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
