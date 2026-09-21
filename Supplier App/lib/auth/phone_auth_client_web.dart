import 'dart:async';
import 'dart:html' as html;
import 'dart:js_util' as js_util;

import 'package:flutter/foundation.dart';

import 'phone_auth.dart';

/// Completes Firebase phone auth on a real HTML page (authorized domain /
/// local Next.js), then returns the ID token to this Flutter window.
class PhoneAuthClient {
  PhoneAuthClient({this.role = 'buyer'});

  final String role;

  Future<PhoneAuthStart> start(String e164) async {
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
      throw Exception('Allow popups for this site, then try Continue with phone again.');
    }

    final done = Completer<String>();
    late final StreamSubscription<html.MessageEvent> sub;
    sub = html.window.onMessage.listen((event) {
      if (event.origin != page.origin) return;
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
    final host = html.window.location.hostname.toLowerCase();
    final local = host == 'localhost' || host == '127.0.0.1';
    // Debug Chrome uses local Next.js. Release / device web uses production
    // (the Firebase authorized domain).
    final base = (local && kDebugMode) ? 'http://localhost:3000' : 'https://www.mygarage.ug';
    return Uri.parse('$base/auth/phone').replace(
      queryParameters: {
        'phone': e164,
        'origin': clientOrigin,
        'role': role,
        'channel': 'app',
      },
    );
  }
}

String? _readString(dynamic data, String key) {
  if (data is Map) {
    final value = data[key];
    return value is String ? value : null;
  }
  try {
    final value = js_util.getProperty(data, key);
    return value is String ? value : null;
  } catch (_) {
    return null;
  }
}
