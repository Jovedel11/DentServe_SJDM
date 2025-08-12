import { useCallback, useEffect, useRef, useState } from "react";
import { authService } from "./authService";
import { supabase } from "../../../supabaseClient";

// session management
const SESSION_DURATION = 60 * 60 * 1000; // 1 hour
const SESSION_CHECK_INTERVAL = 30000; // 30 seconds
const WARNING_TIME = 55 * 60 * 1000 // 55 minutes to show warning
const WARNING_DURATION = 5 * 60 * 1000 // 5 minutes before auto logout
const ACTIVITY_THROTTLE = 1000;          // 1 second throttle 

export const useSessionManager = () => {
  const [showWarning, setShowWarning] = useState(false);
  const [sessionLogout, setSessionLogout] = useState(null);
  const [supabaseSession, setSupabaseSession] = useState(true);
  const [rememberMeEnabled, setRememberMeEnabled] = useState(false);

  // Refs for managing timers and activity
  const customSessionRef = useRef(null);
  const warningTimeoutRef = useRef(null);
  const autoLogoutTimeoutRef = useRef(null);
  const sessionCheckIntervalRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const throttleRef = useRef(false);
  const sessionStartTimeRef = useRef(null);

  // clear all timers and reset state
  const clearAllTimeouts = useCallback(() => {
    [customSessionRef, warningTimeoutRef, autoLogoutTimeoutRef, sessionCheckIntervalRef].forEach(timeout => {
      if (timeout.current) {
        clearTimeout(timeout.current);
        clearInterval(timeout.current);
        timeout.current = null;
        }
      })
      setShowWarning(false);
    }, []);

    // supabase validity
    const checkSupabaseSession = useCallback(async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

      if (!session || error) {
        console.error("Error fetching session:", error);
        setSupabaseSession(false);
        return false;
      }

      // check remember me status
      const rememberMe = await authService.getRememberMeStatus();
      setRememberMeEnabled(rememberMe);

      // check if supabase session is close to expiry
      const expireAt = new Date(session.expires_at * 1000);
      const timeUntilExpiry = expireAt - Date.now(); 

      // if remember me enabled, refresh early to maintain session
      const refreshThreshold = rememberMe ? 15 * 60 * 1000 : 10 * 60 * 1000

      // if supabase session expires within 10 minutes, refresh it
      if (timeUntilExpiry < refreshThreshold && timeUntilExpiry > 0) {
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            console.log("Error refreshing Supabase session:", refreshError);
            setSupabaseSession(false);
            return false
          }
        }
        setSupabaseSession(true);
        return true;
      } catch (error) {
        console.error("Session Validation Error:", error);
        setSupabaseSession(false);
        return false;
      }
    }, [])

    // handle auto logout
    const handleAutoLogout = useCallback(async () => {
      try {
        clearAllTimeouts();

        // for remember me, to show warning
        if (rememberMeEnabled) {
          setShowWarning(true);
          setSessionLogout(false);
          
          // set a longer timer for remember me users
          customSessionRef.current = setTimeout(() => {
            // logout after extended time
            authService.signOut();
            setSessionLogout(true);
            setSupabaseSession(false);
            setRememberMeEnabled(false);
          }, 24 * 60 * 60 * 1000); // 24 hours extended
          
          alert("Your session has been extended due to 'Remember Me'. You'll be logged out in 24 hours.");
        } else {
          await authService.signOut();
          setSessionLogout(true);
          setSupabaseSession(false);
          setRememberMeEnabled(false);
          alert("Your session has expired for security. Please log in again.");
        }
      } catch (error) {
        console.error("Error during auto logout:", error);
      }
    }, [clearAllTimeouts, rememberMeEnabled]);

    // start session timer
    const startSessionTimer = useCallback(() => {
      clearAllTimeouts();

      // record session start time
      sessionStartTimeRef.current = Date.now();

      // set warning timer
      warningTimeoutRef.current = setTimeout(() => {
        setShowWarning(true);
        // auto logout after warning duration
        autoLogoutTimeoutRef.current = setTimeout(() => {
          handleAutoLogout();
        }, WARNING_DURATION);
      }, WARNING_TIME);

      // set absolute session timeout
      customSessionRef.current = setTimeout(() => {
        handleAutoLogout();
      }, SESSION_DURATION);

      // start supabase session checking
      sessionCheckIntervalRef.current = setInterval(async () => {
        const isValidSession = await checkSupabaseSession();
        if (!isValidSession) {
          handleAutoLogout();
        }
      }, SESSION_CHECK_INTERVAL);

    }, [clearAllTimeouts, handleAutoLogout, checkSupabaseSession]);

    // extend session
    const extendSession = useCallback(async () => {
      try {
        
        // refresh supabase session
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.error("Error refreshing Supabase session:", refreshError);
          return { success: false, error: refreshError.message };
        }

        // clear all warning and restart timers
        setShowWarning(false);
        clearAllTimeouts();
        startSessionTimer();


        return { success: true }

      } catch (error) {
        console.error("Error extending session:", error);
        return { success: false, error: error?.message };
      }
    }, [clearAllTimeouts, startSessionTimer, rememberMeEnabled]);

    // reset session timer
    const resetSessionTimer = useCallback(() => {
      const now = Date.now();
      if (throttleRef.current || now - lastActivityRef.current > ACTIVITY_THROTTLE) return;

      throttleRef.current = true;
      lastActivityRef.current = now;

      setTimeout(() => {
        throttleRef.current = false;
      }, ACTIVITY_THROTTLE);

      // only reset if session is active
      if (sessionStartTimeRef.current && !showWarning) startSessionTimer();
    }, [startSessionTimer, showWarning]);

    // reset timer on user activity
    useEffect(() => {
      const { data: { subscription} } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) startSessionTimer();
        if (event === 'SIGNED_OUT') clearAllTimeouts();
      })

      return () => subscription?.unsubscribe()
    }, [startSessionTimer, clearAllTimeouts]);

    // get remaining session time
    const getRemainingTime = useCallback(() => {
      if (!sessionStartTimeRef.current) return 0;

      const elapsed = Date.now() - sessionStartTimeRef.current;
      const remaining = SESSION_DURATION - elapsed;

      return Math.max(0, remaining);
    }, [])

    // if session last 10 mins
    const isSessionExpiringSoon = useCallback(() => {
      const remainingTime = getRemainingTime();
      return remainingTime <= 10 * 60 * 1000; // last 10 minutes
    }, [getRemainingTime]);

    // initial session management
    useEffect(() => {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {

          // Check Remember Me status
          const rememberMe = await authService.getRememberMeStatus();
          setRememberMeEnabled(rememberMe);

          setSessionLogout(false);
          setSupabaseSession(true);
          startSessionTimer();

        } else if (event === 'SIGNED_OUT') {
          clearAllTimeouts();
          setSupabaseSession(false);
          setRememberMeEnabled(false);
        }
      });

      return () => {
        subscription?.unsubscribe();
        clearAllTimeouts();
      }
    }, [startSessionTimer, clearAllTimeouts]);

  const handleAuthStateChange = useCallback(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      let retries = 0;
      const maxRetries = 3;
      
      while (retries < maxRetries) {
        try {
          const { data: role } = await supabase.rpc('get_current_user_role');
          if (role) {
            setRememberMeEnabled(await authService.getRememberMeStatus());
            setSessionLogout(false);
            setSupabaseSession(true);
            startSessionTimer();
            break;
          }
        } catch (error) {
          console.warn(`Retry ${retries + 1} - Profile not ready:`, error);
        }
        
        retries++;
        if (retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
        }
      }
    } else if (event === 'SIGNED_OUT') {
      clearAllTimeouts();
      setSupabaseSession(false);
      setRememberMeEnabled(false);
    }
  }, [startSessionTimer, clearAllTimeouts]);

    useEffect(() => {
      const events = ['click', 'mousemove', 'keydown', 'touchstart', 'scroll'];
      const handleActivity = () => resetSessionTimer();

      events.forEach(event => document.addEventListener(event, handleActivity, { passive: true }));
      return () => {
        events.forEach(event => document.removeEventListener(event, handleActivity))
      }

    }, [resetSessionTimer]);

    // cleanup on unmount
    useEffect(() => {
      return () => {
        clearAllTimeouts();
      }
    }, [clearAllTimeouts]);

    // clean up when user close tab or refresh
    useEffect(() => {
      const handleUnload = () => clearAllTimeouts();

      window.addEventListener('beforeunload', handleUnload);
      return () => {
        window.removeEventListener('beforeunload', handleUnload);
        clearAllTimeouts()
      }
    }, [clearAllTimeouts])

    const sessionTimeout = useCallback(async() => {
      clearAllTimeouts();

      await authService.signOut();
      setSessionLogout(true);
      setSupabaseSession(false);
      setRememberMeEnabled(false);

    }, [clearAllTimeouts]);

    return {
      //state
      showWarning,
      sessionLogout,
      supabaseSession,
      rememberMeEnabled,
      //actions
      extendSession,
      handleAutoLogout,
      startSessionTimer,
      handleAuthStateChange,
      sessionTimeout,
      // utilities
      getRemainingTime,
      isSessionExpiringSoon,
    }
}