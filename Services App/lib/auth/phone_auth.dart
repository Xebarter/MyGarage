import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';

import 'phone.dart';

class PhoneAuthStart {
  const PhoneAuthStart.session(this.idToken) : awaitingSms = false;
  const PhoneAuthStart.awaitingSms() : idToken = null, awaitingSms = true;

  final String? idToken;
  final bool awaitingSms;
}

String phoneSignInErrorMessage(Object error) {
  if (error is FirebaseAuthException) {
    switch (error.code) {
      case 'invalid-phone-number':
        return 'Enter a valid phone number.';
      case 'too-many-requests':
        return 'Too many code requests. Wait a minute, then try again.';
      case 'session-expired':
      case 'code-expired':
        return 'That code expired. Request a new one.';
      case 'invalid-verification-code':
      case 'invalid-verification-id':
        return 'That code is incorrect. Try again.';
      case 'operation-not-allowed':
        return 'Phone sign-in is not enabled yet. Try Google or email.';
      case 'captcha-check-failed':
      case 'missing-recaptcha-token':
      case 'missing-client-identifier':
      case 'invalid-app-credential':
      case 'invalid-app-check':
        return kIsWeb
            ? 'Allow popups, complete the recaptcha in the MyGarage window, then try again.'
            : 'Could not verify this device. Try again.';
      case 'internal-error':
        return 'Could not send a sign-in code. Try again.';
      case 'quota-exceeded':
        return 'SMS quota reached. Try again later.';
      default:
        final message = error.message?.trim() ?? '';
        if (message.isNotEmpty) return phoneAuthErrorMessage(message);
        return 'Could not sign in with this number.';
    }
  }
  final raw = error.toString().replaceFirst(RegExp(r'^Exception:\s*'), '');
  return phoneAuthErrorMessage(raw);
}
