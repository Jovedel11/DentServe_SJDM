import { max } from 'lodash';
import supabase  from '../../supabaseClient';
import twilioClient from '../../twilioClient';

// to generate a random 6-digit verification code
const generationVerificationCode = async (phoneNumber) => {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// to validate a phone number
const validatePhoneNumber = (phoneNumber) => {
  const numberCleaned = phoneNumber.replace(/[^\d+]/g, '');

  const isValid = /^\+[1-9]\d{9,14}$/.test(cleaned);

  return {
    isValid,
    cleanedNumber: numberCleaned,
  }
}

// send sms verification code
const sendSmsVerification = async (phoneNumber, code) => {
  try {
    const message = await twilioClient.messages.create({
      body: `Your verification code is: ${code}. This code is valid for 10 minutes.`,
      from: import.meta.env.VITE_TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    })
    console.log(`SMS sent successfully. SID:${message.sid}`);
    return {
      success: true,
      message: message.sid,
    };

  } catch (error) {
    console.error(`Error sending SMS: ${error.message}`);
    return {
      success: false,
      message: error.message,
      code: error.code || 'TWILIO_ERROR',
    };
  }
};

// to store verification code in the database
const storeVerificationCode = async (phoneNumber, code) => {
  try {
    await supabase
      .from('sms_verification_codes')
      .update({ verified_at: new Date().toISOString() })
      .eq('phone_number', phoneNumber)
      .is('verified_at', null);

      //to insert a new code if no previous code exists
      const { data, error } = await supabase
        .from('sms_verification_codes')
        .insert([{
          phone_number: phoneNumber,
          code: code,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          attempts: 0,
          max_attempts: 3
        }])
        .select()
        .single();

    if (error) {
      console.log('Database error storing verification code:', error);
      return {
        success: false,
        error: {
          message: 'Failed to store verification code',
          code: 'DATABASE_ERROR'
        }
      }
    }

    return {
      success: true,
      data: {
        id: data.id,
        expiresAt: data.expires_at
      }
    };
  } catch (error) {
    console.error('Unexpected error storing verification code:', error);
    return {
      success: false,
      error: {
        message: 'An unexpected error occurred',
        code: 'UNEXPECTED_ERROR'
      }
    };
  }
}

