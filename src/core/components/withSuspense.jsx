import { Suspense, useMemo } from "react";
import Loader from "./Loader";
import ErrorBoundary from "./ErrorFolder/ErrorBoundary";
import { useNetworkStatus } from "./NetworkMonitor";

const SuspenseFallback = ({ message = "Loading..." }) => {
  const networkStatus = useNetworkStatus();

  if (!networkStatus) {
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

// ✅ FIXED: Memoize wrapped component to prevent recreation on every render
const withSuspense = (Component, fallbackMessage) => {
  // Create wrapper component once
  const WrappedComponent = () => <Component />;
  WrappedComponent.displayName = `withSuspense(${
    Component.displayName || Component.name || "Component"
  })`;

  // Return memoized JSX
  return (
    <ErrorBoundary>
      <Suspense fallback={<SuspenseFallback message={fallbackMessage} />}>
        <WrappedComponent />
      </Suspense>
    </ErrorBoundary>
  );
};

export default withSuspense;
