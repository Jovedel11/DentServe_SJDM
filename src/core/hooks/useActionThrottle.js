import { useCallback, useRef } from 'react';
import { debounce, throttle } from 'lodash';
export const useActionThrottle = () => {
  const actionTimestamps = useRef(new Map());
  const pendingActions = useRef(new Map());

  // Prevents rapid button clicks 
  // Unique identifier for the action Cooldown in milliseconds (default: 1000ms)
  const canExecute = useCallback((actionId, cooldown = 1000) => {
    const now = Date.now();
    const lastExecution = actionTimestamps.current.get(actionId) || 0;
    
    if (now - lastExecution < cooldown) {
      console.warn(`⏱️ Action "${actionId}" throttled. ${cooldown - (now - lastExecution)}ms remaining`);
      return false;
    }
    
    actionTimestamps.current.set(actionId, now);
    return true;
  }, []);

   // Debounced callback with automatic cleanup
  const useDebouncedCallback = useCallback((callback, delay = 500) => {
    const debouncedFn = useRef(
      debounce(callback, delay, { leading: false, trailing: true })
    );

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        debouncedFn.current.cancel();
      };
    }, []);

    return debouncedFn.current;
  }, []);

  const useThrottledCallback = useCallback((callback, delay = 1000) => {
    const throttledFn = useRef(
      throttle(callback, delay, { leading: true, trailing: false })
    );

    useEffect(() => {
      return () => {
        throttledFn.current.cancel();
      };
    }, []);

    return throttledFn.current;
  }, []);

  const preventDuplicateSubmit = useCallback((formId) => {
    if (pendingActions.current.has(formId)) {
      console.warn(`🚫 Form "${formId}" already being submitted`);
      return false;
    }
    
    pendingActions.current.set(formId, true);

    setTimeout(() => {
      pendingActions.current.delete(formId);
    }, 5000);
    
    return true;
  }, []);

  const completeAction = useCallback((actionId) => {
    pendingActions.current.delete(actionId);
  }, []);

  const resetThrottles = useCallback(() => {
    actionTimestamps.current.clear();
    pendingActions.current.clear();
  }, []);

  return {
    canExecute,
    useDebouncedCallback,
    useThrottledCallback,
    preventDuplicateSubmit,
    completeAction,
    resetThrottles,
  };
};