import express from 'express';
import { supabase } from '../lib/supabaseSuperAdmin.js';

const router = express.Router();

const supabaseAdmin = supabase;

// Admin change user password endpoint
router.post('/admin/change-user-password', async (req, res) => {
  try {
    const { userId, newPassword, adminToken } = req.body;

    // Validate admin token (you should verify the admin's session)
    if (!adminToken) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Admin token required'
      });
    }

    // Verify the requesting user is an admin
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(adminToken);
    
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid admin token'
      });
    }

    // Check if user is admin in your database
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('user_type')
      .eq('user_id', user.id)
      .single();

    if (profileError || profile?.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied: Admin privileges required'
      });
    }

    // Validate password
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters'
      });
    }

    // Get target user's auth ID
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('auth_user_id, email')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update password using admin API
    const { data, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userData.auth_user_id,
      { password: newPassword }
    );

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: updateError.message
      });
    }

    // Log the action
    await supabaseAdmin.rpc('admin_change_user_password', {
      p_user_id: userId,
      p_new_password: '***'
    });

    res.json({
      success: true,
      message: 'Password changed successfully',
      userEmail: userData.email
    });

  } catch (error) {
    console.error('Admin password change error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to change password'
    });
  }
});

export default router;