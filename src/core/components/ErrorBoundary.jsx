import React from "react";
import { useRouteError } from "react-router-dom";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error) {
    //unique error ID for tracking
    const errorId = `ERR_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error, errorInfo) {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      errorId: this.state.errorId,
    };

    console.group("🔴 Application Error Caught");
    console.error("Error:", error);
    console.error("Error Info:", errorInfo);
    console.error("Full Details:", errorDetails);
    console.groupEnd();

    // In production, you'd send this to your error tracking service
    // Example: Sentry, LogRocket, or custom endpoint
    if (process.env.NODE_ENV === "production") {
      // Send to error tracking service
      this.logErrorToService(errorDetails);
    }

    this.setState({
      error,
      errorInfo,
    });
  }

  logErrorToService = async (errorDetails) => {
    try {
      // TODO - replace with error tracking service
      await fetch("/api/log-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(errorDetails),
      });
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }
  };

  handleRetry = () => {
    this.setState((prevState) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
      errorId: null,
    }));
  };

  render() {
    if (this.state.hasError) {
      const { error, retryCount, errorId } = this.state;

      // NETWORK ERROR DETECTION
      if (
        !navigator.onLine ||
        error?.message?.includes("fetch") ||
        error?.message?.includes("network")
      ) {
        return (
          <NetworkError onRetry={this.handleRetry} retryCount={retryCount} />
        );
      }

      // AUTHENTICATION ERROR DETECTION
      if (
        error?.status === 401 ||
        error?.status === 403 ||
        error?.message?.includes("unauthorized")
      ) {
        return <UnauthorizedError />;
      }

      // VITE CHUNK LOADING ERROR ( important for production!)
      if (
        error?.message?.includes("Loading chunk") ||
        error?.message?.includes("Loading CSS chunk") ||
        error?.message?.includes("ChunkLoadError")
      ) {
        return (
          <ChunkLoadError onRetry={this.handleRetry} retryCount={retryCount} />
        );
      }

      // GENERIC APPLICATION ERROR
      return (
        <ApplicationError
          error={error}
          errorInfo={this.state.errorInfo}
          errorId={errorId}
          onRetry={this.handleRetry}
          retryCount={retryCount}
        />
      );
    }

    return this.props.children;
  }
}

export const RouterErrorBoundary = () => {
  const error = useRouteError();

  // ENHANCED DEBUGGING FOR ROUTER ERRORS
  console.group("🚨 Router Error Detected");
  console.error("Router Error Details:", {
    message: error?.message || "Unknown router error",
    status: error?.status,
    statusText: error?.statusText,
    data: error?.data,
    stack: error?.stack,
    timestamp: new Date().toISOString(),
    currentUrl: window.location.href,
  });
  console.groupEnd();

  const handleRetry = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = "/";
  };

  // handle different router error types
  if (!navigator.onLine) {
    return <NetworkError onRetry={handleRetry} />;
  }

  if (error?.status === 404) {
    return <NotFoundError onGoHome={handleGoHome} />;
  }

  if (error?.status === 401 || error?.status === 403) {
    return <UnauthorizedError />;
  }

  if (error?.message?.includes("Loading chunk")) {
    return <ChunkLoadError onRetry={handleRetry} />;
  }

  return (
    <GenericRouterError
      error={error}
      onRetry={handleRetry}
      onGoHome={handleGoHome}
    />
  );
};

export default ErrorBoundary;
