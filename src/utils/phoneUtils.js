export const phoneUtils = {
  normalizePhilippinePhone(phone) {
    if (!phone) return null;
    
    let cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.startsWith('09') && cleaned.length === 11) {
      return '+63' + cleaned.substring(1);
    } else if (cleaned.startsWith('639') && cleaned.length === 12) {
      return '+' + cleaned;
    } else if (cleaned.startsWith('63') && cleaned.length === 12) {
      return '+' + cleaned;
    } else if (cleaned.length === 10 && cleaned.startsWith('9')) {
      return '+63' + cleaned;
    }
    
    return phone;
  },

  isValidPhilippinePhone(phone) {
    const normalized = this.normalizePhilippinePhone(phone);
    return /^\+639\d{9}$/.test(normalized);
  }
};