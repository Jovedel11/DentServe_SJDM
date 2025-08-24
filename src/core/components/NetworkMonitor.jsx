import { useEffect, useState, createContext, useContext } from "react";

const NetworkContext = createContext();

export const useNetworkStatus = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error("useNetworkStatus must be used within NetworkMonitor");
  }
  return context;
};

export const NetworkMonitor = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState("unknown");

  useEffect(() => {
    //CONNECTION MONITORING
    const updateOnlineStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);

      if (online && wasOffline) {
        // connection restored
        setWasOffline(false);
        console.log("✅ Connection restored");

        // Optional: Trigger data refresh after reconnection
        window.dispatchEvent(new CustomEvent("connection-restored"));
      } else if (!online) {
        // connection lost
        setWasOffline(true);
        console.log("❌ Connection lost");

        // Optional: Cache current state before going offline
        window.dispatchEvent(new CustomEvent("connection-lost"));
      }
    };

    // CONNECTION QUALITY DETECTION
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

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    // initial check
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
    // helper methods
    isSlowConnection:
      connectionQuality === "slow-2g" || connectionQuality === "2g",
    isFastConnection: connectionQuality === "4g",
  };

  return (
    <NetworkContext.Provider value={value}>
      {/* OFFLINE NOTIFICATION BAR */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-red-500 text-white text-center py-3 px-4 z-50 shadow-lg">
          <div className="flex items-center justify-center space-x-2">
            <svg
              className="w-5 h-5 animate-pulse"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-medium">
              You're offline - Some features may not work properly
            </span>
          </div>
        </div>
      )}

      {/* SLOW CONNECTION WARNING (Optional enhancement) */}
      {isOnline && value.isSlowConnection && (
        <div className="fixed top-0 left-0 right-0 bg-orange-500 text-white text-center py-2 px-4 z-40">
          <span className="text-sm">
            Slow connection detected - Please be patient
          </span>
        </div>
      )}

      {/* Main content with appropriate padding */}
      <div
        className={!isOnline ? "pt-14" : value.isSlowConnection ? "pt-10" : ""}
      >
        {children}
      </div>
    </NetworkContext.Provider>
  );
};
