import { supabase } from '../lib/supabaseSuperAdmin.js';

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
      });
    }

    // Verify JWT token
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }

    // Get user from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, phone, is_active, email_verified')
      .eq('auth_user_id', user.id)
      .single();

    if (userError || !userData) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
      });
    }

    // Get user profile
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('id, user_type, first_name, last_name')
      .eq('user_id', userData.id)
      .single();

    // Attach user data to request
    req.user = {
      userId: userData.id,
      authUserId: user.id,
      email: userData.email,
      userProfileId: profileData?.id || null, 
      userType: profileData?.user_type || 'unknown',
      firstName: profileData?.first_name || '',
      lastName: profileData?.last_name || '',
      isActive: userData.is_active,
      emailVerified: userData.email_verified,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};

export default authenticateToken;