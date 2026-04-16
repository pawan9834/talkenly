import { parsePhoneNumber, CountryCode } from "libphonenumber-js/min";
export const normalizeIndianPhoneNumber = (
  phone: string,
  defaultCountry: CountryCode = "IN",
): string | null => {
  if (!phone) return null;
  try {
    const cleaned = phone.replace(/[^\d+]/g, "");
    const phoneNumber = parsePhoneNumber(cleaned, defaultCountry);
    if (phoneNumber && phoneNumber.isValid()) {
      return phoneNumber.format("E.164");
    }
    if (cleaned.length === 10 && !cleaned.startsWith("+")) {
      return `+91${cleaned}`;
    }
    return null;
  } catch (error) {
    return null;
  }
};
