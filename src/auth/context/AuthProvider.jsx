import { createContext, useContext, useEffect, useState } from "react";
import supabase from "../../../supabaseClient";
import { fetchUserRole } from "../hooks/useFetchUserRole";
import { fetchUserProfile } from "../hooks/useFetchProfile";
import { canRequestOtp, getOtpCooldownTime } from "../hooks/requestOtp";

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(undefined);
  const [userRole, setUserRole] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [otpCoolDown, setOtpCoolDown] = useState(otpLocalStorage());

  function otpLocalStorage() {
    const savedOTP = localStorage.getItem("otpCoolDown");
    return savedOTP ? JSON.parse(savedOTP) : {};
  }

  useEffect(() => {
    localStorage.setItem("otpCoolDown", JSON.stringify(otpCoolDown));
  }, [otpCoolDown]);

  useEffect(() => {
    const getSession = async () => {
      setLoading(true);
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) console.error("Error fetching session:", error);
        setSession(session);
        await handleSession(session);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching session:", error);
        setLoading(false);
      }
    };

    getSession();

    // listen for auth state changes
    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event, session);
        setSession(session);
        await handleSession(session);
        setLoading(false);
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  // login with password either email or phone
  const loginWithPassword = async (
    identifier,
    password,
    rememberMe = false
  ) => {
    const isEmail = identifier.includes("@");
    if (isEmail) {
      return await signInWithEmail(identifier, password, rememberMe);
    } else {
      return await signInWithPhoneAndPassword(identifier, password);
    }
  };

  // login with OTP either email or phone
  const loginWithOTP = async (identifier, otp = null) => {
    const isEmail = identifier.includes("@");
    if (otp) {
      // if theres an existing OTP
      const type = isEmail ? "email" : "sms";
      return await verifyOtp(identifier, otp, type);
    } else {
      // not existing OTP, request a new one
      if (isEmail) {
        return await sendEmailOTP(identifier);
      } else {
        return await signInWithPhone(identifier);
      }
    }
  };

  // call it later when signIn is email with password
  async function signInWithEmail(email, password, rememberMe = false) {
    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { user: data?.user, session: data?.session };
    } catch (error) {
      console.error("Error signing in with email:", error);
      setLoading(false);
      throw error;
    }
  }

  // call it later when signIn is phone with OTP
  async function signInWithPhone(phone) {
    if (!canRequestOtp(phone)) {
      const coolDownTime = getOtpCooldownTime(phone, otpCoolDown);
      throw new Error(
        `Please wait ${coolDownTime} seconds before requesting a new OTP.`
      );
    }
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOtp({
        phone,
      });

      if (error) throw error.message;

      setOtpCoolDown((prev) => ({
        ...prev,
        [phone]: Date.now(),
      }));

      return {
        message: "Verification code sent to your phone.",
        phone,
        needsVerification: true,
      };
    } catch (error) {
      console.error("Error signing in with phone:", error);
      setLoading(false);
      throw error;
    }
  }

  // call it later when signIn is phone with password
  async function signInWithPhoneAndPassword(phone, password) {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        phone,
        password,
      });

      if (error) throw error.message;

      return { user: data?.user, session: data?.session };
    } catch (error) {
      console.error("Error signing in with phone and password:", error);
      setLoading(false);
      throw error;
    }
  }

  // call it later when sending OTP to email
  async function sendEmailOTP(email) {
    if (!canRequestOtp(email, otpCoolDown)) {
      const coolDownTime = getOtpCooldownTime(email, otpCoolDown);
      throw new Error(
        `Please wait ${coolDownTime} seconds before requesting a new OTP.`
      );
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithOtp({
        email,
      });

      if (error) throw error.message;

      setOtpCoolDown((prev) => ({
        ...prev,
        [email]: Date.now(),
      }));

      return {
        message: "Verification code sent to your email.",
        email,
        needsVerification: true,
      };
    } catch (error) {
      console.error("Error sending email OTP:", error);
      setLoading(false);
      throw error;
    }
  }

  // call it later when verifying OTP
  async function verifyOtp(identifier, otp, type = "email") {
    try {
      setLoading(true);
      const isEmail = identifier.includes("@");
      const verificationIdentifier = isEmail
        ? { email: identifier, token: otp, type: type }
        : { phone: identifier, token: otp, type: type };

      const { data, error } = await supabase.auth.verifyOtp(
        verificationIdentifier
      );

      if (error) throw error.message;

      // clear OTP cooldown on successful verification
      setOtpCoolDown((prev) => {
        const updated = { ...prev };
        delete updated[identifier];
        return updated;
      });

      return { user: data?.user, session: data?.session };
    } catch (error) {
      console.error("Error signing out:", error);
      setLoading(false);
      throw error;
    }
  }

  const value = {
    // State
    session,
    userRole,
    user,
    userProfile,
    loading,
    // Auth methods
    loginWithPassword,
    loginWithOTP,
  };

  async function handleSession(session) {
    if (session) {
      const role = await fetchUserRole(); // fetch user role based on session
      const profile = await fetchUserProfile(session?.user?.id); // fetch user profile based on session
      setUserRole(role);
      setUser(session?.user);
      setUserProfile(profile);
    } else {
      setUserRole(null);
      setUser(null);
      setUserProfile(null);
    }
  }

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
