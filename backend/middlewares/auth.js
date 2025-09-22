import { supabase } from "../lib/supabaseSuperAdmin.js";

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }
    
    const token = authHeader.substring(7); // remove 'Bearer ' prefix
    
    // verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('Token verification failed:', error?.message);
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
    
    // get user's profile information from your database
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select(`
        id,
        auth_user_id,
        email,
        user_profiles!inner(
          id,
          user_type,
          first_name,
          last_name
        )
      `)
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .single();
    
    if (profileError || !userProfile) {
      console.error('User profile fetch failed:', profileError?.message);
      return res.status(401).json({
        success: false,
        error: 'User profile not found'
      });
    }
    
    // attach user info to request
    req.user = {
      authUserId: user.id,
      userId: userProfile.id,
      userProfileId: userProfile.user_profiles.id,
      email: userProfile.email,
      userType: userProfile.user_profiles.user_type,
      firstName: userProfile.user_profiles.first_name,
      lastName: userProfile.user_profiles.last_name
    };
    
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

export default authenticateToken;