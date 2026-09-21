import 'phone_auth.dart';

/// Native phone SMS uses the hosted `/auth/phone` WebView (Play Integrity
/// rejects the web Firebase app id inside `verifyPhoneNumber`).
class PhoneAuthClient {
  PhoneAuthClient({this.role = 'buyer'});

  final String role;

  Future<PhoneAuthStart> start(String e164) async {
    throw StateError('Native phone sign-in uses the hosted recaptcha page.');
  }

  Future<String> confirmSmsCode(String _) async {
    throw Exception('Request a new code.');
  }

  Future<void> abort() async {}
}
