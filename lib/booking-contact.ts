export const BOOKING_CONTACT_CONSENT_VERSION = "2026-08-24-v2";

export type BookingContactSubmission = {
  fullName: string;
  email: string | null;
  phoneE164: string | null;
  consentVersion: typeof BOOKING_CONTACT_CONSENT_VERSION;
  consentedAt: string;
  sourcePath: "/book";
};

type ValidationResult =
  | { ok: true; value: BookingContactSubmission; honeypotTriggered: boolean }
  | { ok: false; message: string };

function normalizePhone(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const digits = trimmed.replace(/[^0-9]/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (trimmed.startsWith("+") && digits.length >= 8 && digits.length <= 15) {
    return `+${digits}`;
  }
  return undefined;
}

export function validateBookingContactSubmission(input: unknown): ValidationResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, message: "Enter your contact details to continue." };
  }

  const body = input as Record<string, unknown>;
  const fullName =
    typeof body.fullName === "string"
      ? body.fullName.trim().replace(/\s+/g, " ")
      : "";
  if (fullName.length < 2 || fullName.length > 100) {
    return { ok: false, message: "Enter your full name." };
  }

  const emailInput = typeof body.email === "string" ? body.email.trim() : "";
  const email = emailInput ? emailInput.toLowerCase() : null;
  if (
    email &&
    (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  ) {
    return { ok: false, message: "Enter a valid email address." };
  }

  const phoneInput = typeof body.phone === "string" ? body.phone : "";
  const phoneE164 = normalizePhone(phoneInput);
  if (phoneE164 === undefined) {
    return { ok: false, message: "Enter a valid mobile number, including the country code if outside the U.S." };
  }
  if (!email && !phoneE164) {
    return { ok: false, message: "Enter an email address, a mobile number, or both." };
  }

  if (
    body.consent !== true ||
    body.consentVersion !== BOOKING_CONTACT_CONSENT_VERSION
  ) {
    return { ok: false, message: "Please agree to the booking-contact notice." };
  }

  return {
    ok: true,
    honeypotTriggered:
      typeof body.company === "string" && body.company.trim().length > 0,
    value: {
      fullName,
      email,
      phoneE164,
      consentVersion: BOOKING_CONTACT_CONSENT_VERSION,
      consentedAt: new Date().toISOString(),
      sourcePath: "/book",
    },
  };
}
