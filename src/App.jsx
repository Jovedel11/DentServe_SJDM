import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { AuthProvider } from "./auth/context/AuthProvider";
import { ThemeProvider } from "./core/contexts/ThemeProvider";
import ErrorBoundary from "./core/components/ErrorFolder/ErrorBoundary";
import * as Sentry from "@sentry/react";
import "./core/styles/global.css";

Sentry.init({
  dsn: "https://e9b018cf8a2b73e64f6b93e0d35a048c@o4509898883727360.ingest.us.sentry.io/4509898884775936",
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
  beforeSend(event) {
    // Filter out development errors in production
    if (process.env.NODE_ENV === "development") {
      return event;
    }

    // Only send important errors in production
    const ignoredErrors = [
      "Network request failed",
      "Loading chunk",
      "Script error",
    ];

    const shouldIgnore = ignoredErrors.some(
      (error) =>
        event.message?.includes(error) ||
        event.exception?.values?.[0]?.value?.includes(error)
    );

    return shouldIgnore ? null : event;
  },
});

function App() {
  return (
    <ErrorBoundary userId="app-level">
      <ThemeProvider defaultTheme="system" storageKey="dental-theme">
        <AuthProvider>
          <RouterProvider
            router={router}
            fallbackElement={
              <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p>Loading application...</p>
                </div>
              </div>
            }
          />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
