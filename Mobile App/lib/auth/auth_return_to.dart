import 'dart:async';

import 'package:shared_preferences/shared_preferences.dart';

const _key = 'mygarage_auth_return_to';

/// Remembers the screen to reopen after sign-in (OAuth can wipe the nav stack).
class AuthReturnTo {
  AuthReturnTo._();

  static String? _pending;

  static String? get pending => _pending;

  static bool isSafePath(String? path) {
    if (path == null || path.isEmpty) return false;
    if (!path.startsWith('/')) return false;
    if (path.startsWith('//')) return false;
    return true;
  }

  static Future<void> hydrate() async {
    if (_pending != null) return;
    final prefs = await SharedPreferences.getInstance();
    final value = prefs.getString(_key);
    if (isSafePath(value)) _pending = value;
  }

  static Future<void> save(String path) async {
    if (!isSafePath(path)) return;
    _pending = path;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, path);
  }

  static String? consumeSync() {
    final value = _pending;
    _pending = null;
    unawaited(SharedPreferences.getInstance().then((prefs) => prefs.remove(_key)));
    return isSafePath(value) ? value : null;
  }
}
