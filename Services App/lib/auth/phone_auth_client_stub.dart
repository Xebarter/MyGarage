import 'phone_auth.dart';

class PhoneAuthClient {
  PhoneAuthClient({this.role = 'buyer'});

  final String role;

  Future<PhoneAuthStart> start(String e164) {
    throw UnsupportedError('Phone sign-in is not available on this platform.');
  }

  Future<String> confirmSmsCode(String _) {
    throw UnsupportedError('Phone sign-in is not available on this platform.');
  }

  Future<void> abort() async {}
}
