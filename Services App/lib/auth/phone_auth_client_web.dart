// ignore_for_file: deprecated_member_use, avoid_web_libraries_in_flutter

import 'dart:async';
import 'dart:html' as html;

import 'phone_auth.dart';
import '../config.dart';
import '../utils/settle_keyboard.dart';

/// Completes Firebase phone auth on the live site, then returns the ID token.
///
/// Firebase rejects real SMS from `localhost` (`sendVerificationCode` 400 /
/// `INVALID_APP_CREDENTIAL`) even when Phone is enabled in the console.
class PhoneAuthClient {
  PhoneAuthClient({this.role = 'buyer'});

  final String role;

  Future<PhoneAuthStart> start(String e164) async {
    await settleKeyboard();
    final token = await _completeInHostedPage(e164);
    return PhoneAuthStart.session(token);
  }

  Future<String> confirmSmsCode(String _) async {
    throw Exception('Request a new code.');
  }

  Future<void> abort() async {}

  Future<String> _completeInHostedPage(String e164) async {
    final clientOrigin = html.window.location.origin;
    final page = _phoneAuthUri(e164, clientOrigin);
    final popup = html.window.open(
      page.toString(),
      'mygarage-phone-auth',
      'popup=yes,width=440,height=760',
    );
    if (popup == null) {
      throw Exception('Allow popups for MyGarage, then try again.');
    }

    final done = Completer<String>();
    late final StreamSubscription<html.MessageEvent> sub;
    sub = html.window.onMessage.listen((event) {
      if (!_isPhoneAuthMessageOrigin(event.origin)) return;
      final data = event.data;
      if (data == null) return;
      try {
        if (_readString(data, 'source') != 'mygarage-phone-auth') return;
        final error = _readString(data, 'error');
        if (error != null && error.trim().isNotEmpty) {
          if (!done.isCompleted) done.completeError(Exception(error.trim()));
          return;
        }
        final token = _readString(data, 'idToken');
        if (token != null && token.isNotEmpty && !done.isCompleted) {
          done.complete(token);
        }
      } catch (_) {}
    });

    final poll = Timer.periodic(const Duration(milliseconds: 400), (_) {
      try {
        if (popup.closed == true && !done.isCompleted) {
          done.completeError(Exception('Phone sign-in window was closed.'));
        }
      } catch (_) {}
    });

    try {
      return await done.future.timeout(
        const Duration(minutes: 4),
        onTimeout: () => throw Exception('Phone sign-in timed out. Try again.'),
      );
    } finally {
      await sub.cancel();
      poll.cancel();
      try {
        popup.close();
      } catch (_) {}
    }
  }

  Uri _phoneAuthUri(String e164, String clientOrigin) {
    return Uri.parse('${AppConfig.phoneAuthPageBase}/auth/phone').replace(
      queryParameters: {
        'phone': e164,
        'origin': clientOrigin,
        'role': role,
        'channel': 'app',
      },
    );
  }
}

bool _isPhoneAuthMessageOrigin(String origin) {
  try {
    final host = Uri.parse(origin).host.toLowerCase();
    return host == 'www.mygarage.ug' ||
        host == 'mygarage.ug' ||
        host == 'localhost' ||
        host == '127.0.0.1';
  } catch (_) {
    return false;
  }
}

String? _readString(dynamic data, String key) {
  if (data is Map) {
    final value = data[key];
    return value is String ? value : null;
  }
  try {
    // ignore: avoid_dynamic_calls
    final value = data[key];
    return value is String ? value : null;
  } catch (_) {
    return null;
  }
}
