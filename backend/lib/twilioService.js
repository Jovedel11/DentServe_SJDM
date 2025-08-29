import twilio from 'twilio';

class TwilioService {
  constructor() {
    if (!process.env.TWILIO_ACCOUNT_SID) {
      throw new Error('TWILIO_ACCOUNT_SID environment variable is required');
    }
    if (!process.env.TWILIO_AUTH_TOKEN) {
      throw new Error('TWILIO_AUTH_TOKEN environment variable is required');
    }
    if (!process.env.TWILIO_PHONE_NUMBER) {
      throw new Error('TWILIO_PHONE_NUMBER environment variable is required');
    }
    
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
    
    console.log('✅ Twilio Service initialized');
    console.log('📞 From Number:', this.fromNumber);
  }

  async sendOTP(to, otp, purpose = 'verification') {
    try {
      const message = this.generateOTPMessage(otp, purpose);
      
      console.log(`📱 Sending SMS to ${to}:`, message);
      
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: to
      });

      console.log(`✅ SMS sent successfully. SID: ${result.sid}`);
      
      return {
        success: true,
        sid: result.sid,
        status: result.status,
        to: result.to
      };
    } catch (error) {
      console.error('❌ Twilio SMS Error:', error);
      
      return {
        success: false,
        error: this.handleTwilioError(error)
      };
    }
  }

  generateOTPMessage(otp, purpose) {
    const messages = {
      login: `Your DentalCare login code is: ${otp}\n\nThis code expires in 10 minutes. Don't share this code with anyone.`,
      verification: `Your DentalCare verification code is: ${otp}\n\nThis code expires in 10 minutes. Don't share this code with anyone.`,
      phone_verification: `Your DentalCare phone verification code is: ${otp}\n\nThis code expires in 10 minutes. Don't share this code with anyone.`
    };

    return messages[purpose] || messages.verification;
  }

  handleTwilioError(error) {
    console.error('📋 Full Twilio Error:', {
      code: error.code,
      message: error.message,
      status: error.status,
      moreInfo: error.moreInfo
    });

    if (error.code) {
      switch (error.code) {
        case 21211:
          return 'Invalid phone number format';
        case 21614:
          return 'Phone number is not a valid mobile number';
        case 21408:
          return 'Phone number does not appear to be valid';
        case 21659:
          return 'Invalid mobile number format. Please use +639XXXXXXXXX format';
        case 30003:
          return 'Phone number is unreachable';
        case 30008:
          return 'Phone number is not reachable from this country';
        default:
          return `SMS delivery failed (Code: ${error.code}): ${error.message}`;
      }
    }
    return 'Failed to send SMS. Please try again.';
  }

  /**
   * ✅ ENHANCED: Philippine phone validation with detailed logging
   */
  static isValidPhilippinePhone(phone) {
    if (!phone || typeof phone !== 'string') {
      console.log('❌ Phone validation: empty or invalid phone');
      return false;
    }
    
    console.log(`🔍 Validating phone: "${phone}" (length: ${phone.length})`);
    
    // Must be in +639XXXXXXXXX format (13 characters total)
    // Philippine mobile numbers: +639XXXXXXXXX
    const philippineRegex = /^\+639[0-9]{9}$/;
    const isValid = philippineRegex.test(phone);
    
    console.log(`📱 Phone validation result: ${phone} -> ${isValid}`);
    
    // ✅ DEBUGGING: Show detailed breakdown
    if (!isValid) {
      console.log(`❌ Validation failed for: "${phone}"`);
      console.log(`   - Starts with +639: ${phone.startsWith('+639')}`);
      console.log(`   - Length is 13: ${phone.length === 13}`);
      console.log(`   - Matches full regex: ${philippineRegex.test(phone)}`);
      
      // Check if it's close to valid format
      if (phone.startsWith('+63')) {
        console.log(`   - After +63: "${phone.substring(3)}" (should be 9XXXXXXXXX)`);
      }
    }
    
    return isValid;
  }

  /**
   * ✅ ENHANCED: Philippine phone normalization with better error handling
   */
  static normalizePhilippinePhone(phone) {
    if (!phone || typeof phone !== 'string') {
      console.log('❌ Cannot normalize: phone is null or not a string');
      return null;
    }
    
    console.log(`🔄 Normalizing phone: "${phone}"`);
    
    // Remove all spaces, dashes, parentheses, dots
    let cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
    
    // Remove all non-digits except + at the beginning
    cleaned = cleaned.replace(/[^\d+]/g, '');
    
    console.log(`🧹 Cleaned: "${cleaned}"`);
    
    // Handle different formats
    if (cleaned.startsWith('+639')) {
      // Already in +639 format - check length
      if (cleaned.length === 13) {
        console.log('✅ Already in correct +639XXXXXXXXX format');
        return cleaned;
      } else {
        console.log(`❌ Wrong length for +639 format: ${cleaned.length} (should be 13)`);
        return null;
      }
    } else if (cleaned.startsWith('+6309')) {
      // Fix +6309XXXXXXXXX -> +639XXXXXXXXX (remove the 0)
      if (cleaned.length === 14) {
        const result = '+639' + cleaned.substring(5);
        console.log(`🔄 Fixed +6309 format to: ${result}`);
        return result;
      } else {
        console.log(`❌ Wrong length for +6309 format: ${cleaned.length} (should be 14)`);
        return null;
      }
    } else if (cleaned.startsWith('+630')) {
      // Fix +630XXXXXXXXX -> +639XXXXXXXXX (replace 0 with 9)
      if (cleaned.length === 13) {
        const result = '+639' + cleaned.substring(4);
        console.log(`🔄 Fixed +630 format to: ${result}`);
        return result;
      } else {
        console.log(`❌ Wrong length for +630 format: ${cleaned.length} (should be 13)`);
        return null;
      }
    } else if (cleaned.startsWith('639')) {
      // Format: 639XXXXXXXXX
      if (cleaned.length === 12) {
        const result = `+${cleaned}`;
        console.log(`🔄 Converted 639 format to: ${result}`);
        return result;
      } else {
        console.log(`❌ Wrong length for 639 format: ${cleaned.length} (should be 12)`);
        return null;
      }
    } else if (cleaned.startsWith('6309')) {
      // Fix 6309XXXXXXXXX -> +639XXXXXXXXX
      if (cleaned.length === 13) {
        const result = `+639${cleaned.substring(4)}`;
        console.log(`🔄 Fixed 6309 format to: ${result}`);
        return result;
      } else {
        console.log(`❌ Wrong length for 6309 format: ${cleaned.length} (should be 13)`);
        return null;
      }
    } else if (cleaned.startsWith('630')) {
      // Fix 630XXXXXXXXX -> +639XXXXXXXXX
      if (cleaned.length === 12) {
        const result = `+639${cleaned.substring(3)}`;
        console.log(`🔄 Fixed 630 format to: ${result}`);
        return result;
      } else {
        console.log(`❌ Wrong length for 630 format: ${cleaned.length} (should be 12)`);
        return null;
      }
    } else if (cleaned.startsWith('09')) {
      // Format: 09XXXXXXXXX
      if (cleaned.length === 11) {
        const result = `+63${cleaned.substring(1)}`;
        console.log(`🔄 Converted 09 format to: ${result}`);
        return result;
      } else {
        console.log(`❌ Wrong length for 09 format: ${cleaned.length} (should be 11)`);
        return null;
      }
    } else if (cleaned.startsWith('9')) {
      // Format: 9XXXXXXXXX
      if (cleaned.length === 10) {
        const result = `+639${cleaned}`;
        console.log(`🔄 Converted 9 format to: ${result}`);
        return result;
      } else {
        console.log(`❌ Wrong length for 9 format: ${cleaned.length} (should be 10)`);
        return null;
      }
    }
    
    console.log(`❌ Could not normalize phone number: "${phone}" -> "${cleaned}"`);
    console.log(`   - Input: "${phone}"`);
    console.log(`   - Cleaned: "${cleaned}"`);
    console.log(`   - Length: ${cleaned.length}`);
    console.log(`   - Starts with: ${cleaned.substring(0, 4)}`);
    
    return null;
  }
}

export default TwilioService;