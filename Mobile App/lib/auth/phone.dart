String digitsOnly(String value) => value.replaceAll(RegExp(r'\D'), '');

/// Uganda-first E.164. Accepts 07xx, 7xx, 256…, or a full +country number.
String? normalizeToE164(String raw) {
  final trimmed = raw.trim();
  if (trimmed.isEmpty) return null;
  final digits = digitsOnly(trimmed);

  if (trimmed.startsWith('+') && digits.length >= 10 && digits.length <= 15) {
    return '+$digits';
  }
  if (digits.startsWith('256') && digits.length == 12) {
    return '+$digits';
  }
  if (digits.startsWith('0') && digits.length == 10) {
    return '+256${digits.substring(1)}';
  }
  if (digits.length == 9 && digits.startsWith('7')) {
    return '+256$digits';
  }
  if (digits.length >= 10 && digits.length <= 15) {
    return '+$digits';
  }
  return null;
}

String formatE164Display(String phone) {
  final e164 = normalizeToE164(phone);
  if (e164 == null) return phone.trim();
  if (e164.startsWith('+256') && e164.length == 13) {
    return '+256 ${e164.substring(4, 7)} ${e164.substring(7, 10)} ${e164.substring(10)}';
  }
  return e164;
}

String placeholderEmailForPhone(String phone) {
  final e164 = normalizeToE164(phone) ?? phone;
  final digits = digitsOnly(e164);
  return 'phone.${digits.isEmpty ? 'unknown' : digits}@users.mygarage.app';
}

bool isPlaceholderEmail(String? email) {
  final value = (email ?? '').trim().toLowerCase();
  return value.startsWith('phone.') && value.endsWith('@users.mygarage.app');
}

const _genericDisplayNames = {'customer', 'buyer', 'user', 'there', 'guest'};

/// True when [name] was auto-filled from a phone/email instead of a real person name.
bool isPlaceholderDisplayName(String name, {String phone = '', String email = ''}) {
  final n = name.trim();
  if (n.isEmpty) return true;
  final lower = n.toLowerCase();
  if (_genericDisplayNames.contains(lower)) return true;
  if (RegExp(r'\(\s*(buyer|vendor|service provider|admin)\s*\)\s*$', caseSensitive: false)
      .hasMatch(n)) {
    return true;
  }
  if (lower.startsWith('phone.')) return true;

  final nameDigits = digitsOnly(n);
  if (nameDigits.length >= 9 && RegExp(r'^\+?[\d\s\-()]+$').hasMatch(n)) return true;

  final phoneDigits = digitsOnly(phone);
  if (phoneDigits.length >= 9 && nameDigits == phoneDigits) return true;

  final mail = email.trim().toLowerCase();
  final local = mail.contains('@') ? mail.split('@').first : mail;
  if (local.isNotEmpty && n == local && isPlaceholderEmail(mail)) return true;
  return false;
}

String firstGivenName(String fullName) {
  final parts = fullName.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty);
  return parts.isEmpty ? '' : parts.first;
}

String phoneAuthErrorMessage(String message) {
  final s = message.toLowerCase();
  if (s.contains('unsupported phone') ||
      s.contains('phone provider') ||
      s.contains('phone_provider') ||
      s.contains('sms provider') ||
      s.contains('error sending confirmation otp')) {
    return 'Phone sign-in is not enabled yet. Try Google or email, or try again shortly.';
  }
  if (s.contains('rate') || s.contains('too many')) {
    return 'Too many code requests. Wait a minute, then try again.';
  }
  if (s.contains('expired')) {
    return 'That code expired. Request a new one.';
  }
  if (s.contains('invalid') && (s.contains('token') || s.contains('otp') || s.contains('code'))) {
    return 'That code is incorrect. Try again.';
  }
  if (s.contains('captcha')) {
    return 'Could not verify this device. Try again on your phone.';
  }
  return message.trim().isEmpty ? 'Could not sign in with this number.' : message.trim();
}
