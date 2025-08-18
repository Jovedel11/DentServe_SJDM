import { useNavigate } from "react-router-dom";
import { LockIllustration } from "./lock-illustration";

const UnauthorizedPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-5">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-10 text-center">
        <div className="relative mx-auto w-44 h-44 mb-8">
          <LockIllustration />
          <div className="absolute top-0 right-0 bg-amber-500 text-white text-xl font-bold w-16 h-16 rounded-full flex items-center justify-center transform rotate-12 shadow-lg">
            401
          </div>
        </div>

        <h1 className="text-3xl font-bold text-blue-900 mb-4">
          Access Restricted
        </h1>

        <p className="text-gray-600 mb-8 leading-relaxed">
          You don't have permission to view this page. Please sign in with the
          appropriate credentials or contact your administrator for access.
        </p>

        <div className="flex flex-col gap-4">
          <button
            className="bg-amber-500 hover:bg-amber-600 text-white font-semibold py-4 px-8 rounded-full transition-all duration-300 transform hover:-translate-y-0.5 shadow-lg hover:shadow-xl active:translate-y-0"
            onClick={() => navigate("/login")}
            aria-label="Go to login page"
          >
            Sign In
          </button>

          <div className="flex justify-center gap-4 flex-wrap">
            <button
              className="text-amber-500 border border-amber-100 hover:bg-amber-50 font-medium py-3 px-6 rounded-full transition-all duration-300 transform hover:-translate-y-0.5 shadow hover:shadow-md active:translate-y-0"
              onClick={() => navigate("/contact")}
              aria-label="Contact support"
            >
              Request Access
            </button>
            <button
              className="text-amber-500 border border-amber-100 hover:bg-amber-50 font-medium py-3 px-6 rounded-full transition-all duration-300 transform hover:-translate-y-0.5 shadow hover:shadow-md active:translate-y-0"
              onClick={() => navigate("/")}
              aria-label="Return to homepage"
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
