import { useNetworkStatus } from "@/core/components/NetworkMonitor";
import Loader from "@/core/components/Loader";

export const NetworkAwareLoader = ({
  message = "Loading...",
  showNetworkStatus = true,
  fallback = null,
}) => {
  const networkStatus = useNetworkStatus();

  if (!networkStatus && fallback) {
    return fallback;
  }

  const { isOnline, isSlowConnection, wasOffline } = networkStatus || {};

  let loadingMessage = message;
  let loaderColor = "#38bdf8";

  if (!isOnline) {
    loadingMessage = "Waiting for connection...";
    loaderColor = "#ef4444";
  } else if (wasOffline) {
    loadingMessage = "Reconnecting...";
    loaderColor = "#f59e0b";
  } else if (isSlowConnection) {
    loadingMessage = `${message} (slow connection)`;
    loaderColor = "#f59e0b";
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader size="large" color={loaderColor} message={loadingMessage} />

        {showNetworkStatus && !isOnline && (
          <div className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">
            No internet connection. Please check your network.
          </div>
        )}

        {showNetworkStatus && isSlowConnection && isOnline && (
          <div className="text-sm text-orange-600 bg-orange-50 px-4 py-2 rounded-lg">
            Slow connection detected. Loading may take longer.
          </div>
        )}
      </div>
    </div>
  );
};
