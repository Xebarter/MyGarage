export function countPhoneDigits(value: string): number {
  return (value || '').replace(/\D/g, '').length;
}

export function isValidBuyerPhone(value: string | null | undefined): boolean {
  return countPhoneDigits(value ?? '') >= 9;
}

export function isPhoneRequiredServiceError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('phone_required') ||
    lower.includes('mobile number') ||
    lower.includes('phone number') ||
    lower.includes('valid mobile')
  );
}
