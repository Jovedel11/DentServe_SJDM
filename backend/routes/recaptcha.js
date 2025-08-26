import express from "express"
import axios from "axios";

const router = express.Router(); // route handler

router.post('/verify', async (req, res) => {
  try {
    // data from front
    const { token, action, expectedAction } = req.body;
    // check logs
    console.log('recaptcha verification request', {
      hasToken: token,
      action,
      expectedAction,
      clientIP: req.ip
    });

    // validate input
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'recaptcha token is required',
        code: 'MISSING_TOKEN'
      });
    }

    if (!process.env.RECAPTCHA_SECRET_KEY) {
      console.error('recaptcha secret key is not config');
      return res.status(400).json({
        success: false,
        error: 'recaptcha verification not config',
        code: 'CONFIGURATION_ERROR'
      });
    }

    // verify
    console.log('Verifying token...');
    const verificationResponse = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null, // no body
      {
        params: {
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: token,
          remoteip: req.ip,
        },
        timeout: 10000 // 10 seconds
      }
    );

    // parse google response
    const {
      success,
      score,
      action: returnedAction,
      challenge_ts,
      hostname,
      'error-codes': errorCodes
    } = verificationResponse.data

    console.log('Google verification result:', {
      success,
      score,
      action: returnedAction,
      hostname,
      errorCodes
    });

    // check verification
    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'recaptcha verification failed',
        code: 'VERIFICATION_FAILED',
        details: errorCodes || ['unknown-error']
      });
    }

    // if verify action match
    const actionToCheck = expectedAction || action;
    if (actionToCheck && returnedAction !== actionToCheck) {
      console.warn('Action mismatch', {
        expected: actionToCheck,
        received: returnedAction,
      });

      return res.status(400).json({
        success: false,
        error: 'recaptcha action mismatch',
        code: 'ACTION_MISMATCH',
        expected: actionToCheck,
        received: returnedAction
      });
    }

    // check scores
    const scoreThresholds = {
      login: 0.5,
      patient_signup: 0.5, // patient register
      staff_invite: 0.7, // higher security
      admin_invite: 0.8, // higher security
      otp_request: 0.3, // lower threshold
      default: 0.5
    }

    const minScore = scoreThresholds[returnedAction] || scoreThresholds.default;

    if (score < minScore) {
      console.warn('Low recaptcha score', {
        score,
        minRequired: minScore,
        action: returnedAction
      });

      return res.status(400).json({
        success: false,
        error: 'recaptcha score too low',
        code: 'LOW_SCORE',
        score,
        minRequired: minScore,
        recommendation: 'Please try again or use alternative verification'
      });
    }

    // success
    console.log('recaptcha verification successful', {
      score,
      action: returnedAction
    });

    res.json({
      success: true,
      score,
      action: returnedAction,
      hostname,
      timestamp: challenge_ts,
      message: 'recaptcha verification successful'
    });

  } catch (error) {
    console.error('❌ recaptcha verification error:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
      status: error.response?.status
    });

    if (error.code === 'ECONNABORTED') {
      return res.status(408).json({
        success: false,
        error: 'reCAPTCHA verification timeout',
        code: 'TIMEOUT'
      });
    }

    if (error.response?.status === 400) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reCAPTCHA request',
        code: 'INVALID_REQUEST'
      });
    }

    res.status(500).json({
      success: false,
      error: 'reCAPTCHA verification service error',
      code: 'SERVICE_ERROR'
    });
  }
});

export default router;