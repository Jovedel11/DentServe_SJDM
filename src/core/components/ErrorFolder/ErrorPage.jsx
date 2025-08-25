import React from "react";
import { useNavigate, useRouteError } from "react-router-dom";
import { ToothIllustration } from "@/core/components/ui/tooh-illustration";

const ErrorPage = () => {
  const navigate = useNavigate();
  const error = useRouteError();

  // Check if this is a 404 error or other route error
  const is404 =
    !error || error.status === 404 || error.statusText === "Not Found";
  const errorMessage = error?.data || error?.statusText || error?.message;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-5">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-10 text-center">
        <div className="relative mx-auto w-44 h-44 mb-8">
          <ToothIllustration />
          <div className="absolute top-0 right-0 bg-red-500 text-white text-xl font-bold w-16 h-16 rounded-full flex items-center justify-center transform rotate-12 shadow-lg">
            {is404 ? "404" : "ERR"}
          </div>
        </div>

        <h1 className="text-3xl font-bold text-blue-900 mb-4">
          {is404 ? "Oops! That page is missing" : "Something went wrong"}
        </h1>

        <p className="text-gray-600 mb-8 leading-relaxed">
          {is404
            ? "We couldn't find the page you're looking for. It might have been moved or deleted. Let's get you back on track for your dental care journey."
            : "There was an error loading this page. Please try again or contact support if the problem persists."}
        </p>

        {errorMessage && errorMessage !== "Unknown error" && (
          <div className="text-red-500 text-sm mb-6 p-3 bg-red-50 rounded border border-red-100">
            Error Details: {errorMessage}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <button
            className="bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-4 px-8 rounded-full transition-all duration-300 transform hover:-translate-y-0.5 shadow-lg hover:shadow-xl active:translate-y-0"
            onClick={() => navigate("/")}
            aria-label="Return to homepage"
          >
            Return to Homepage
          </button>

          <div className="flex justify-center gap-4 flex-wrap">
            {!is404 && (
              <button
                className="text-cyan-500 border border-cyan-100 hover:bg-cyan-50 font-medium py-3 px-6 rounded-full transition-all duration-300 transform hover:-translate-y-0.5 shadow hover:shadow-md active:translate-y-0"
                onClick={() => window.location.reload()}
                aria-label="Retry loading page"
              >
                Try Again
              </button>
            )}
            <button
              className="text-cyan-500 border border-cyan-100 hover:bg-cyan-50 font-medium py-3 px-6 rounded-full transition-all duration-300 transform hover:-translate-y-0.5 shadow hover:shadow-md active:translate-y-0"
              onClick={() => navigate("/contact")}
              aria-label="Contact support"
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;
