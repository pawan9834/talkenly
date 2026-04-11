import { parsePhoneNumber, CountryCode } from 'libphonenumber-js/min';

/**
 * Normalizes a phone number to E.164 format, specifically optimized for Indian numbers.
 * Handled formats:
 * - 9876543210 (10-digit)
 * - 09876543210 (11-digit)
 * - +91 98765 43210 (with country code and spaces)
 * - 919876543210 (country code without +)
 * 
 * @param phone The raw phone number string from device contacts
 * @param defaultCountry Default country code, defaults to 'IN' (India)
 * @returns Normalized E.164 string or null if invalid
 */
export const normalizeIndianPhoneNumber = (phone: string, defaultCountry: CountryCode = 'IN'): string | null => {
  if (!phone) return null;
  
  try {
    // Basic cleaning to handle cases where libphonenumber might struggle
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    const phoneNumber = parsePhoneNumber(cleaned, defaultCountry);
    
    if (phoneNumber && phoneNumber.isValid()) {
      return phoneNumber.format('E.164');
    }
    
    // Fallback for common Indian 10-digit entry if libphonenumber fails (unlikely)
    if (cleaned.length === 10 && !cleaned.startsWith('+')) {
        return `+91${cleaned}`;
    }

    return null;
  } catch (error) {
    console.warn(`[phoneUtils] Normalization failed for ${phone}:`, error);
    return null;
  }
};
