import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { AuthProvider } from "./auth/context/AuthProvider";
import ErrorBoundary from "./core/components/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <RouterProvider
          router={router}
          fallbackElement={
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
              <div className="text-center p-8">
                <div className="text-6xl mb-4 animate-pulse">🚀</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Loading Application
                </h2>
                <p className="text-gray-600">
                  Please wait while we set up your experience...
                </p>
                <div className="mt-6">
                  <div className="w-48 h-2 bg-gray-200 rounded-full mx-auto">
                    <div
                      className="h-2 bg-blue-600 rounded-full animate-pulse"
                      style={{ width: "70%" }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          }
        />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
