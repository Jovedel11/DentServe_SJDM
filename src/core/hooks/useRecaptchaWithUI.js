import { useState } from 'react';
import { useRecaptcha } from '@/auth/hooks/useRecaptcha';

export const useRecaptchaWithUI = (action = 'form_submit') => {
  const { executeRecaptchaWithFallback, isLoaded, isVerifying } = useRecaptcha();
  const [verificationState, setVerificationState] = useState({
    verified: false,
    error: null,
    score: null,
    hasAttempted: false,
    token: null // Store the actual token
  });

  const executeVerification = async () => {
    try {
      setVerificationState(prev => ({
        ...prev,
        error: null,
        hasAttempted: true
      }));

      console.log(`🔄 Starting reCAPTCHA verification for: ${action}`);
      
      const result = await executeRecaptchaWithFallback(action);
      
      setVerificationState({
        verified: true,
        error: null,
        score: result.score,
        hasAttempted: true,
        token: result.token // Store the real token
      });

      console.log(`✅ reCAPTCHA verification successful with score: ${result.score}`);
      
      return result;

    } catch (error) {
      console.error('❌ reCAPTCHA verification failed:', error);
      
      setVerificationState({
        verified: false,
        error: error.message,
        score: null,
        hasAttempted: true,
        token: null
      });
      
      throw error;
    }
  };

  // Create a function that returns the verified result
  const getVerifiedRecaptcha = () => {
    if (!verificationState.verified) {
      throw new Error('reCAPTCHA not verified yet');
    }
    
    return Promise.resolve({
      token: verificationState.token,
      score: verificationState.score,
      verified: true
    });
  };

  const resetVerification = () => {
    setVerificationState({
      verified: false,
      error: null,
      score: null,
      hasAttempted: false,
      token: null
    });
  };

  return {
    // State
    isLoaded,
    isVerifying,
    verified: verificationState.verified,
    error: verificationState.error,
    score: verificationState.score,
    hasAttempted: verificationState.hasAttempted,
    token: verificationState.token,
    
    // Methods
    executeVerification,
    getVerifiedRecaptcha, // Use this instead of mock functions
    resetVerification,
    
    // For component props
    verificationState,
    setVerificationState
  };
};