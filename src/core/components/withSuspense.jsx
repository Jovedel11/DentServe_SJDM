import { Suspense } from "react";
import Loader from "./Loader";
import ErrorBoundary from "./ErrorFolder/ErrorBoundary";
import { useNetworkStatus } from "./NetworkMonitor";

const SuspenseFallback = ({ message = "Loading..." }) => {
  const networkStatus = useNetworkStatus();

  if (!networkStatus) {
    // Fallback if NetworkMonitor is not available
    return <Loader type="spinner" size="large" message={message} />;
  }

  const { isOnline, isSlowConnection } = networkStatus;

  let loadingMessage = message;

  if (!isOnline) {
    loadingMessage = "Waiting for connection...";
  } else if (isSlowConnection) {
    loadingMessage = "Loading (slow connection detected)...";
  }

  return <Loader type="spinner" size="large" message={loadingMessage} />;
};

const withSuspense = (Component, fallbackMessage) => {
  return (
    <ErrorBoundary>
      <Suspense fallback={<SuspenseFallback message={fallbackMessage} />}>
        <Component />
      </Suspense>
    </ErrorBoundary>
  );
};

export default withSuspense;
