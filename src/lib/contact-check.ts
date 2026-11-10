// Contact details are kept only if they appear in the resume text, because the model can invent them.

const EMAIL_PATTERN = /^[^\s@<>()"']+@[^\s@<>()"']+\.[^\s@<>()"']+$/;
const PHONE_PATTERN = /^\+?[\d\s().-]{7,25}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email);
}

export function isValidPhone(phone: string): boolean {
  return PHONE_PATTERN.test(phone) && phone.replace(/\D/g, "").length >= 7;
}

export function emailAppearsIn(text: string, email: string): boolean {
  return text.toLowerCase().includes(email.toLowerCase());
}

/** True when the phone number appears in the text, ignoring spaces, brackets and dashes. */
export function phoneAppearsIn(text: string, phone: string): boolean {
  if (text.includes(phone)) return true;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return false;
  const candidates = text.match(/\+?\d[\d\s().-]{5,}\d/g) ?? [];
  return candidates.some((candidate) => candidate.replace(/\D/g, "") === digits);
}

/** Returns the email and phone only when they are valid and found in the resume. */
export function verifiedContacts(
  resumeText: string,
  email: string | null,
  phone: string | null,
): { email: string | null; phone: string | null } {
  return {
    email: email && isValidEmail(email) && emailAppearsIn(resumeText, email) ? email : null,
    phone: phone && isValidPhone(phone) && phoneAppearsIn(resumeText, phone) ? phone : null,
  };
}
