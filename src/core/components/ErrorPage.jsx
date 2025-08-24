import React from "react";
import { useNavigate } from "react-router-dom";
import { ToothIllustration } from "./tooh-illustration";

export const ErrorPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-5">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-10 text-center">
        <div className="relative mx-auto w-44 h-44 mb-8">
          <ToothIllustration />
          <div className="absolute top-0 right-0 bg-red-500 text-white text-xl font-bold w-16 h-16 rounded-full flex items-center justify-center transform rotate-12 shadow-lg">
            404
          </div>
        </div>

        <h1 className="text-3xl font-bold text-blue-900 mb-4">
          Oops! That page is missing
        </h1>

        <p className="text-gray-600 mb-8 leading-relaxed">
          We couldn't find the page you're looking for. It might have been moved
          or deleted. Let's get you back on track for your dental care journey.
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
            <button
              className="text-cyan-500 border border-cyan-100 hover:bg-cyan-50 font-medium py-3 px-6 rounded-full transition-all duration-300 transform hover:-translate-y-0.5 shadow hover:shadow-md active:translate-y-0"
              onClick={() => navigate("/contact")}
              aria-label="Contact support"
            >
              Contact Support
            </button>
            <button
              className="text-cyan-500 border border-cyan-100 hover:bg-cyan-50 font-medium py-3 px-6 rounded-full transition-all duration-300 transform hover:-translate-y-0.5 shadow hover:shadow-md active:translate-y-0"
              onClick={() => navigate("/report")}
              aria-label="Report a broken link"
            >
              Report Broken Link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
