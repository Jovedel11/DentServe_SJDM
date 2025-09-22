import { supabase } from '@/lib/supabaseClient'

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

      // Email verification automatically triggers database functions:
      // 1. Updates email_verified = true in public.users
      // 2. For patients: they can now access the app
      // 3. For staff: they need to complete profile setup
      // 4. Updates metadata with verification status

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
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user?.email) {
        throw new Error('No user email found')
      }

      const { data, error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: user.email
      })

      if (resendError) {
        throw new Error(resendError?.message || 'Failed to resend verification email')
      }

      console.log('✅ Verification email resent to:', user.email)
      return { success: true, message: 'Verification email sent successfully' }

    } catch (error) {
      console.error('❌ Resend email error:', error)
      const errorMsg = error?.message || 'Failed to resend email'
      return { success: false, error: errorMsg }
    }
  }
}