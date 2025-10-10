import { supabase } from '@/lib/supabaseClient'

const getRedirectURL = (path = '/auth-callback?type=patient') => {
  // Use environment variable for production
  if (import.meta.env.PROD && import.meta.env.VITE_SITE_URL) {
    return `${import.meta.env.VITE_SITE_URL}${path}`;
  }
  // Fallback for development
  return `${window.location.origin}${path}`;
};

export const useVerification = {
  // Handle email verification callback
  async handleEmailVerification(token, type) {
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: type
      })

      if (verifyError) {
        throw new Error(verifyError?.message || 'Email verification failed')
      }

      console.log('✅ Email verification successful:', data.user?.email)
      return { success: true, user: data.user }

    } catch (error) {
      console.error('❌ Email verification error:', error)
      return { success: false, error: error.message || 'Email verification failed' }
    }
  },


  // Resend email verification
  async resendEmailVerification() {
    try {
      console.log('🔄 Resending verification email...');
      
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user?.email) {
        throw new Error('No user email found')
      }

      // ✅ Get the user type from metadata to set correct redirect
      const userType = user.user_metadata?.user_type || 'patient';
      const redirectURL = getRedirectURL(`/auth-callback?type=${userType}`);
      
      console.log('📧 Resend redirect URL:', redirectURL);
      console.log('👤 User email:', user.email);

      const { data, error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: redirectURL 
        }
      })

      if (resendError) {
        console.error('❌ Resend error:', resendError);
        throw new Error(resendError?.message || 'Failed to resend verification email')
      }

      console.log('✅ Verification email resent successfully to:', user.email)
      return { success: true, message: 'Verification email sent successfully' }

    } catch (error) {
      console.error('❌ Resend email error:', error)
      const errorMsg = error?.message || 'Failed to resend email'
      return { success: false, error: errorMsg }
    }
  }
}