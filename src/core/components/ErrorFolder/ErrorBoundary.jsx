import React from "react";
import { useRouteError } from "react-router-dom";
import * as Sentry from "@sentry/react";

// Sentry Error Types for better categorization
const ERROR_TYPES = {
  NETWORK: "network",
  CHUNK_LOAD: "chunk_load",
  AUTHENTICATION: "auth",
  AUTHORIZATION: "authorization",
  ROUTE_NOT_FOUND: "route_404",
  APPLICATION: "application",
  UNKNOWN: "unknown",
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: null,
      retryCount: 0,
      errorId: null,
      isRetrying: false,
    };
  }

  static getDerivedStateFromError(error) {
    const errorId = `ERR_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const errorType = ErrorBoundary.categorizeError(error);

    return {
      hasError: true,
      error,
      errorId,
      errorType,
    };
  }

  static categorizeError(error) {
    if (!navigator.onLine) return ERROR_TYPES.NETWORK;

    const message = error?.message?.toLowerCase() || "";

    if (
      message.includes("loading chunk") ||
      message.includes("loading css chunk") ||
      message.includes("chunkloaderror")
    ) {
      return ERROR_TYPES.CHUNK_LOAD;
    }

    if (error?.status === 401 || message.includes("unauthorized")) {
      return ERROR_TYPES.AUTHENTICATION;
    }

    if (error?.status === 403 || message.includes("forbidden")) {
      return ERROR_TYPES.AUTHORIZATION;
    }

    if (error?.status === 404) return ERROR_TYPES.ROUTE_NOT_FOUND;

    if (message.includes("fetch") || message.includes("network")) {
      return ERROR_TYPES.NETWORK;
    }

    return ERROR_TYPES.APPLICATION;
  }

  componentDidCatch(error, errorInfo) {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorType: this.state.errorType,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      errorId: this.state.errorId,
      userId: this.props.userId || "anonymous",
      retryCount: this.state.retryCount,
    };

    console.group("🔴 Application Error Caught");
    console.error("Error:", error);
    console.error("Error Type:", this.state.errorType);
    console.error("Error Info:", errorInfo);
    console.error("Full Details:", errorDetails);
    console.groupEnd();

    // Send to Sentry with additional context
    Sentry.withScope((scope) => {
      scope.setTag("errorType", this.state.errorType);
      scope.setTag("errorId", this.state.errorId);
      scope.setLevel("error");
      scope.setContext("errorInfo", {
        componentStack: errorInfo.componentStack,
        retryCount: this.state.retryCount,
      });

      if (this.props.userId) {
        scope.setUser({ id: this.props.userId });
      }

      Sentry.captureException(error);
    });

    this.setState({ error, errorInfo });
  }

  handleRetry = async () => {
    this.setState({ isRetrying: true });

    // For chunk load errors, force reload
    if (this.state.errorType === ERROR_TYPES.CHUNK_LOAD) {
      // Clear any cached chunks
      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      }
      window.location.reload();
      return;
    }

    // For network errors, wait a bit before retry
    if (this.state.errorType === ERROR_TYPES.NETWORK) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    this.setState((prevState) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: null,
      retryCount: prevState.retryCount + 1,
      errorId: null,
      isRetrying: false,
    }));
  };

  render() {
    if (this.state.hasError) {
      const { error, errorType, retryCount, errorId, isRetrying } = this.state;

      // Show appropriate error component based on error type
      switch (errorType) {
        case ERROR_TYPES.NETWORK:
          return (
            <NetworkErrorComponent
              onRetry={this.handleRetry}
              retryCount={retryCount}
              isRetrying={isRetrying}
              errorId={errorId}
            />
          );

        case ERROR_TYPES.CHUNK_LOAD:
          return (
            <ChunkLoadErrorComponent
              onRetry={this.handleRetry}
              retryCount={retryCount}
              isRetrying={isRetrying}
              errorId={errorId}
            />
          );

        case ERROR_TYPES.AUTHENTICATION:
          return (
            <AuthErrorComponent onRetry={this.handleRetry} errorId={errorId} />
          );

        case ERROR_TYPES.AUTHORIZATION:
          return (
            <UnauthorizedErrorComponent
              onRetry={this.handleRetry}
              errorId={errorId}
            />
          );

        default:
          return (
            <ApplicationErrorComponent
              error={error}
              errorInfo={this.state.errorInfo}
              errorId={errorId}
              onRetry={this.handleRetry}
              retryCount={retryCount}
              isRetrying={isRetrying}
            />
          );
      }
    }

    return this.props.children;
  }
}

// Router Error Boundary for React Router errors
export const RouterErrorBoundary = () => {
  const error = useRouteError();

  React.useEffect(() => {
    const errorType = ErrorBoundary.categorizeError(error);

    const errorDetails = {
      message: error?.message || "Unknown router error",
      status: error?.status,
      statusText: error?.statusText,
      data: error?.data,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      currentUrl: window.location.href,
      errorType,
    };

    console.group("🚨 Router Error Detected");
    console.error("Router Error Details:", errorDetails);
    console.groupEnd();

    // Send router errors to Sentry
    Sentry.withScope((scope) => {
      scope.setTag("errorType", "router_error");
      scope.setTag("routerErrorType", errorType);
      scope.setLevel("error");
      scope.setContext("routerError", errorDetails);

      Sentry.captureException(
        new Error(`Router Error: ${error?.message || "Unknown router error"}`)
      );
    });
  }, [error]);

  const handleRetry = () => window.location.reload();
  const handleGoHome = () => (window.location.href = "/");

  // Handle different router error types
  if (!navigator.onLine) {
    return <NetworkErrorComponent onRetry={handleRetry} />;
  }

  if (error?.status === 404) {
    return <NotFoundErrorComponent onGoHome={handleGoHome} />;
  }

  if (error?.status === 401 || error?.status === 403) {
    return <UnauthorizedErrorComponent />;
  }

  if (error?.message?.includes("Loading chunk")) {
    return <ChunkLoadErrorComponent onRetry={handleRetry} />;
  }

  return (
    <GenericRouterErrorComponent
      error={error}
      onRetry={handleRetry}
      onGoHome={handleGoHome}
    />
  );
};

// Error Components
const NetworkErrorComponent = ({
  onRetry,
  retryCount,
  isRetrying,
  errorId,
}) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 p-5">
    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
      <div className="w-20 h-20 mx-auto mb-6 text-red-500">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
          />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Connection Lost</h1>
      <p className="text-gray-600 mb-6">
        Please check your internet connection and try again.
      </p>
      <button
        onClick={onRetry}
        disabled={isRetrying}
        className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
      >
        {isRetrying
          ? "Retrying..."
          : `Retry${retryCount > 0 ? ` (${retryCount})` : ""}`}
      </button>
      {errorId && (
        <p className="text-xs text-gray-400 mt-4">Error ID: {errorId}</p>
      )}
    </div>
  </div>
);

const ChunkLoadErrorComponent = ({
  onRetry,
  retryCount,
  isRetrying,
  errorId,
}) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 p-5">
    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
      <div className="w-20 h-20 mx-auto mb-6 text-orange-500">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Update Required</h1>
      <p className="text-gray-600 mb-6">
        The application has been updated. Please refresh to get the latest
        version.
      </p>
      <button
        onClick={onRetry}
        disabled={isRetrying}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
      >
        {isRetrying ? "Updating..." : "Refresh Application"}
      </button>
      {errorId && (
        <p className="text-xs text-gray-400 mt-4">Error ID: {errorId}</p>
      )}
    </div>
  </div>
);

const ApplicationErrorComponent = ({
  error,
  errorInfo,
  errorId,
  onRetry,
  retryCount,
  isRetrying,
}) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 p-5">
    <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8 text-center">
      <div className="w-20 h-20 mx-auto mb-6 text-red-500">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">
        Something went wrong
      </h1>
      <p className="text-gray-600 mb-6">
        We encountered an unexpected error. Our team has been notified.
      </p>
      <div className="flex gap-4">
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          {isRetrying
            ? "Retrying..."
            : `Try Again${retryCount > 0 ? ` (${retryCount})` : ""}`}
        </button>
        <button
          onClick={() => (window.location.href = "/")}
          className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Go Home
        </button>
      </div>
      {import.meta.env.VITE_NODE_ENV === "development" && error && (
        <details className="mt-6 text-left">
          <summary className="cursor-pointer text-red-600 font-medium">
            Error Details (Development)
          </summary>
          <pre className="mt-2 text-xs bg-red-50 p-4 rounded border overflow-auto max-h-40">
            {error.message}
            {error.stack}
          </pre>
        </details>
      )}
      {errorId && (
        <p className="text-xs text-gray-400 mt-4">Error ID: {errorId}</p>
      )}
    </div>
  </div>
);

// Additional error components for auth, unauthorized, not found, etc.
const AuthErrorComponent = ({ onRetry, errorId }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 p-5">
    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
      <div className="w-20 h-20 mx-auto mb-6 text-amber-500">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">
        Authentication Required
      </h1>
      <p className="text-gray-600 mb-6">
        Your session has expired. Please sign in again.
      </p>
      <button
        onClick={() => (window.location.href = "/login")}
        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
      >
        Sign In
      </button>
      {errorId && (
        <p className="text-xs text-gray-400 mt-4">Error ID: {errorId}</p>
      )}
    </div>
  </div>
);

const UnauthorizedErrorComponent = ({ errorId }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 p-5">
    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
      <div className="w-20 h-20 mx-auto mb-6 text-red-500">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"
          />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
      <p className="text-gray-600 mb-6">
        You don't have permission to access this resource.
      </p>
      <button
        onClick={() => (window.location.href = "/")}
        className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
      >
        Go Home
      </button>
      {errorId && (
        <p className="text-xs text-gray-400 mt-4">Error ID: {errorId}</p>
      )}
    </div>
  </div>
);

const NotFoundErrorComponent = ({ onGoHome }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 p-5">
    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
      <div className="text-8xl font-bold text-blue-500 mb-4">404</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Page Not Found</h1>
      <p className="text-gray-600 mb-6">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <button
        onClick={onGoHome}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
      >
        Go Home
      </button>
    </div>
  </div>
);

const GenericRouterErrorComponent = ({ error, onRetry, onGoHome }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 p-5">
    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
      <div className="w-20 h-20 mx-auto mb-6 text-red-500">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">
        Navigation Error
      </h1>
      <p className="text-gray-600 mb-6">
        There was a problem loading this page.
      </p>
      <div className="flex gap-4">
        <button
          onClick={onRetry}
          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Retry
        </button>
        <button
          onClick={onGoHome}
          className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Go Home
        </button>
      </div>
    </div>
  </div>
);

export default ErrorBoundary;
