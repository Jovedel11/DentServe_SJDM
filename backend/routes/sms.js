import express from 'express';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import TwilioService from '../lib/twilioService.js';
import { adminSupabase } from '../lib/supabaseSuperAdmin.js';
import authenticateToken from '../middlewares/auth.js'; 

const router = express.Router();

// Add this debug endpoint to your sms.js
router.post('/debug-twilio-send', async (req, res) => {
  try {
    if (!twilioService) {
      return res.status(500).json({
        success: false,
        error: 'Twilio service not available'
      });
    }

    const { phone } = req.body;
    const testOTP = '123456';
    
    console.log(`🧪 Testing Twilio SMS to: ${phone}`);
    
    // Test direct Twilio send without going through your OTP flow
    const result = await twilioService.client.messages.create({
      body: `Test message - Your verification code is: ${testOTP}`,
      from: twilioService.fromNumber,
      to: phone
    });

    res.json({
      success: true,
      message: 'Direct Twilio test successful',
      twilioSid: result.sid,
      status: result.status,
      to: result.to,
      from: result.from
    });

  } catch (error) {
    console.error('❌ Direct Twilio error:', error);
    res.json({
      success: false,
      error: error.message,
      code: error.code,
      status: error.status,
      moreInfo: error.moreInfo
    });
  }
});

// Test phone endpoint (keep this - it's working)
router.post('/test-phone', async (req, res) => {
  try {
    const { phone: rawPhone } = req.body;
    
    console.log(`🔍 Testing phone: "${rawPhone}"`);
    
    const normalized = TwilioService.normalizePhilippinePhone(rawPhone);
    const isValid = normalized ? TwilioService.isValidPhilippinePhone(normalized) : false;
    
    res.json({
      success: true,
      original: rawPhone,
      normalized: normalized,
      isValid: isValid,
      message: isValid ? 'Phone number is valid' : 'Phone number is invalid',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Phone test error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Initialize Twilio (this is working based on your debug output)
let twilioService;
try {
  twilioService = new TwilioService();
  console.log('✅ Twilio Service initialized successfully');
} catch (error) {
  console.error('❌ Twilio Service initialization failed:', error.message);
}

// Debug endpoint (keep this for troubleshooting)
router.get('/debug-twilio', (req, res) => {
  res.json({
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ? 'SET' : 'MISSING',
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ? 'SET' : 'MISSING', 
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER ? 'SET' : 'MISSING',
    twilioService: twilioService ? 'INITIALIZED' : 'NULL',
    twilioError: null,
    staticMethodsWork: typeof TwilioService.normalizePhilippinePhone === 'function'
  });
});

// Rate limiting
const smsRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    error: 'Too many SMS requests. Please wait before requesting another code.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.body.phone || req.ip;
  }
});

// ✅ SIMPLIFIED VALIDATION - No complex phone validation in middleware
const validateSendOTP = [
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required'),
  body('purpose')
    .optional()
    .isIn(['login', 'verification', 'phone_verification'])
    .withMessage('Invalid purpose')
];

const validateVerifyOTP = [
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be 6 digits'),
  body('purpose')
    .optional()
    .isIn(['login', 'verification', 'phone_verification'])
    .withMessage('Invalid purpose')
];

/**
 * POST /api/sms/send-otp
 * ✅ FIXED VERSION - No validation middleware issues
 */
router.post('/send-otp', smsRateLimit, validateSendOTP, async (req, res) => {
  try {
    // Check if Twilio is initialized
    if (!twilioService) {
      return res.status(500).json({
        success: false,
        error: 'SMS service is not available. Please check server configuration.',
        timestamp: new Date().toISOString()
      });
    }

    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg,
        timestamp: new Date().toISOString()
      });
    }

    const { phone: rawPhone, purpose = 'verification' } = req.body;
    
    console.log(`🔐 OTP Request - Raw Phone: ${rawPhone}, Purpose: ${purpose}`);

    // ✅ FIXED: Phone normalization and validation in route handler (not middleware)
    const phone = TwilioService.normalizePhilippinePhone(rawPhone);
    
    if (!phone) {
      console.log('❌ Phone normalization failed:', rawPhone);
      return res.status(400).json({
        success: false,
        error: 'Could not process phone number. Please check format.',
        debug: {
          raw_phone: rawPhone,
          normalized: phone
        },
        timestamp: new Date().toISOString()
      });
    }

    // ✅ FIXED: Validation check in route handler
    if (!TwilioService.isValidPhilippinePhone(phone)) {
      console.log('❌ Phone validation failed:', phone);
      return res.status(400).json({
        success: false,
        error: 'Invalid Philippine mobile number format',
        debug: {
          raw_phone: rawPhone,
          normalized: phone
        },
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`✅ Phone processed: ${rawPhone} -> ${phone}`);

    // For login, check if user exists
    if (purpose === 'login') {
      const { data: userExists, error: userCheckError } = await adminSupabase
        .from('users')
        .select('id, phone_verified')
        .eq('phone', phone)
        .eq('is_active', true)
        .maybeSingle();

      if (userCheckError) {
        console.error('❌ User check error:', userCheckError);
        return res.status(500).json({
          success: false,
          error: 'Failed to verify user',
          timestamp: new Date().toISOString()
        });
      }

      if (!userExists) {
        console.log('❌ User not found for phone:', phone);
        return res.status(404).json({
          success: false,
          error: 'No account found with this phone number',
          timestamp: new Date().toISOString()
        });
      }

      if (!userExists.phone_verified) {
        return res.status(400).json({
          success: false,
          error: 'Phone number not verified. Please complete verification first.',
          timestamp: new Date().toISOString()
        });
      }
    }

    // Generate OTP using your Supabase function
    console.log(`🔄 Generating OTP for ${phone} with purpose: ${purpose}`);
    
    const { data: otpData, error: otpError } = await adminSupabase
      .rpc('generate_otp', {
        p_identifier: phone,
        p_identifier_type: 'phone',
        p_purpose: purpose
      });

    if (otpError) {
      console.error('❌ OTP generation error:', otpError);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate verification code',
        debug: { supabase_error: otpError.message },
        timestamp: new Date().toISOString()
      });
    }

    if (!otpData) {
      console.error('❌ OTP generation returned no data');
      return res.status(500).json({
        success: false,
        error: 'Failed to generate verification code - no OTP returned',
        timestamp: new Date().toISOString()
      });
    }

    console.log(`✅ OTP Generated: ${otpData} for ${phone}`);

    // Send SMS via Twilio
    console.log(`📱 Sending SMS to ${phone}...`);
    const smsResult = await twilioService.sendOTP(phone, otpData, purpose);

    if (!smsResult.success) {
      console.error('❌ SMS sending failed:', smsResult.error);
      return res.status(500).json({
        success: false,
        error: `SMS sending failed: ${smsResult.error}`,
        timestamp: new Date().toISOString()
      });
    }

    console.log('✅ SMS sent successfully:', smsResult.sid);

    // Success response
    res.json({
      success: true,
      message: 'Verification code sent to your phone',
      phone: phone,
      twilioSid: smsResult.sid,
      debug: {
        raw_phone: rawPhone,
        normalized_phone: phone,
        purpose: purpose,
        otp_generated: true,
        sms_sent: true
      },
      ...(process.env.NODE_ENV === 'development' && { otp_for_testing: otpData }),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Send OTP Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send verification code',
      debug: { 
        error_message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/sms/verify-otp
 * Verify OTP code
 */
router.post('/verify-otp', validateVerifyOTP, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg,
        timestamp: new Date().toISOString()
      });
    }

    const { phone: rawPhone, otp, purpose = 'verification' } = req.body;
    
    console.log(`🔍 OTP Verification Request - Raw Phone: ${rawPhone}, Purpose: ${purpose}`);
    
    // Normalize phone
    const phone = TwilioService.normalizePhilippinePhone(rawPhone);
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Could not process phone number',
        debug: {
          raw_phone: rawPhone,
          normalized: phone
        },
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`🔍 OTP Verification - Phone: ${phone}, OTP: ${otp}, Purpose: ${purpose}`);

    // Verify OTP using your Supabase function
    const { data: isValid, error: verifyError } = await adminSupabase
      .rpc('verify_otp', {
        p_identifier: phone,
        p_otp_code: otp,
        p_purpose: purpose
      });

    if (verifyError) {
      console.error('❌ OTP verification error:', verifyError);
      return res.status(500).json({
        success: false,
        error: 'Verification failed',
        debug: { supabase_error: verifyError.message },
        timestamp: new Date().toISOString()
      });
    }

    if (!isValid) {
      console.log('❌ OTP verification failed - invalid OTP');
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification code',
        timestamp: new Date().toISOString()
      });
    }

    console.log(`✅ OTP Verified successfully for ${phone}`);

    // For login purpose, return user data
    if (purpose === 'login') {
      const { data: userData, error: userError } = await adminSupabase
        .from('users')
        .select(`
          id,
          auth_user_id,
          email,
          phone,
          user_profiles!inner(
            id,
            user_type,
            first_name,
            last_name
          )
        `)
        .eq('phone', phone)
        .eq('is_active', true)
        .single();

      if (userError || !userData) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          timestamp: new Date().toISOString()
        });
      }

      return res.json({
        success: true,
        verified: true,
        purpose: purpose,
        user: {
          id: userData.id,
          auth_user_id: userData.auth_user_id,
          email: userData.email,
          phone: userData.phone,
          user_type: userData.user_profiles.user_type,
          first_name: userData.user_profiles.first_name,
          last_name: userData.user_profiles.last_name
        },
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      verified: true,
      purpose: purpose,
      message: 'Phone number verified successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Verify OTP Error:', error);
    res.status(500).json({
      success: false,
      error: 'Verification failed',
      debug: { 
        error_message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/sms/send-verification-otp
 * Send OTP for phone verification (requires authentication)
 */
router.post('/send-verification-otp', authenticateToken, async (req, res) => {
  try {
    if (!twilioService) {
      return res.status(500).json({
        success: false,
        error: 'SMS service is not available',
        timestamp: new Date().toISOString()
      });
    }

    const userId = req.user.userId;
    
    const { data: userData, error: userError } = await adminSupabase
      .from('users')
      .select('phone')
      .eq('id', userId)
      .single();

    if (userError || !userData || !userData.phone) {
      return res.status(400).json({
        success: false,
        error: 'No phone number found for this user',
        timestamp: new Date().toISOString()
      });
    }

    const phone = userData.phone;
    
    const { data: otpData, error: otpError } = await adminSupabase
      .rpc('generate_otp', {
        p_identifier: phone,
        p_identifier_type: 'phone',
        p_purpose: 'phone_verification'
      });

    if (otpError || !otpData) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate verification code',
        timestamp: new Date().toISOString()
      });
    }

    const smsResult = await twilioService.sendOTP(phone, otpData, 'phone_verification');

    if (!smsResult.success) {
      return res.status(500).json({
        success: false,
        error: smsResult.error,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Verification code sent to your phone',
      phone: phone,
      ...(process.env.NODE_ENV === 'development' && { otp_for_testing: otpData }),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Send verification OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send verification code',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;