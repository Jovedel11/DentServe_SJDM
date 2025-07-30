import { createContext, useContext, useEffect, useState } from "react";
import supabase from "../../../supabaseClient";

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(undefined);
  const [loading, setLoading] = useState(true);

  // fetch session to get Session of user
  useEffect(() => {
    const fetchSession = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) console.error(error.message);
        console.log("Session fetched:", data.session);
        setSession(data.session);
        setLoading(false);
      } catch (error) {
        console.error("Unexpected error:", error);
        setLoading(false);
      }
    };
    fetchSession();

    // subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event);
      setSession(session);
    });

    // cleanup subscription on unmount
    return () => subscription.unsubscribe();
  }, []);

  // phone number detection
  const isPhoneNumber = (input) => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const toCleanInput = input.replace(/[\s\-\(\)]/g, "");
    return phoneRegex.test(toCleanInput) && !input.includes("@");
  };

  // validation if the user is signin is email or phone
  const signInUser = async (emailOrPhone, password = null) => {
    const input = emailOrPhone.trim();

    if (isPhoneNumber(input)) {
      // if input is number
      return {
        success: false,
        error: {
          message: "Phone authentication not yet implemented",
        },
      };
    } else {
      if (!password) {
        return {
          success: false,
          error: {
            message: "Password is required for email authentication",
            code: "PASSWORD_REQUIRED",
          },
        };
      }
      return await signUpUserEmail(input, password);
    }
  };

  // declaration so i can call it later to sing up a user if they use email
  async function signInUserEmail(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        return {
          success: false,
          error: {
            message: error.message,
            code: error.code || "An error occurred during sign-in",
          },
        };
      }

      if (!data.session) {
        return {
          success: false,
          error: {
            message: "No session found after sign-in",
            code: "NO_SESSION",
          },
        };
      }

      return {
        success: true,
        data: {
          session: data.session,
          user: data.user,
        },
      };
    } catch (error) {
      console.error("Sign-in error:", error);
      console.error("Email sign-in error:", error);
      return {
        success: false,
        error: {
          message: error.message || "An unexpected error occurred",
          code: "UNEXPECTED_ERROR",
        },
      };
    }
  }

  const signUpUserEmail = async (email, password, options = {}) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: options.metadata || {},
        },
      });
      if (error) {
        return {
          success: false,
          error: {
            message: error.message,
            error: error.code || "email_address_not_authorized",
          },
        };
      }

      return {
        success: true,
        data: {
          user: data.user,
          session: data.session,
          needsConfirmation:
            data?.session && data?.user && !data?.user?.email_confirmed_at,
        },
      };
    } catch (error) {
      console.log("Unexpected Error");
      return {
        success: false,
        error: {
          message: error.message || "An unexpected error occurred",
          code: "UNEXPECTED_ERROR",
        },
      };
    }
  };

  // handle signOut user
  const signOutUser = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        return {
          success: false,
          error: {
            message: error.message,
            code: error.code || "Sing Out Error",
          },
        };
      }

      return { success: true };
    } catch (error) {
      console.error("Sign-out error:", error);
      return {
        success: false,
        error: {
          message: error.message || "An unexpected error occurred",
          code: "UNEXPECTED_ERROR",
        },
      };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        signInUserEmail,
        signUpUserEmail,
        signOutUser,
        signInUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
export default AuthProvider;
