import { createContext, useContext, useEffect, useState } from "react";
import supabase from "../../../supabaseClient";
import { fetchUserRole } from "../hooks/useFetchUserRole";

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(undefined);
  const [userRole, setUserRole] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      setLoading(true);
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        error && console.error("Error fetching session:", error);
        setSession(session);
        if (session) {
          const role = await fetchUserRole(); // fetch user role based on session
          setUserRole(role);
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching session:", error);
        setLoading(false);
      }
    };

    getSession();

    // listen for auth state changes
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth state changed:", event, session);
        setSession(session);
        if (session) {
          fetchUserRole().then(setUserRole);
        } else {
          setUserRole(null);
        }
      }
    );

    return () => subscription?.subscription?.unsubscribe();
  }, []);

  const value = {
    // State
    // Auth methods
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
export default AuthProvider;
