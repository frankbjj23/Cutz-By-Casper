export const OWNER_CODE_MIN_LENGTH = 6;
export const OWNER_CODE_MAX_LENGTH = 10;

export function normalizeOwnerCode(value: string) {
  return value.replace(/\D/g, "").slice(0, OWNER_CODE_MAX_LENGTH);
}

export function isValidOwnerCode(value: string) {
  return /^\d{6,10}$/.test(value);
}
