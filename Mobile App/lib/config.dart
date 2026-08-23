import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

class AppConfig {
  AppConfig._();

  static String? _env(String key) {
    if (!dotenv.isInitialized) return null;
    final v = dotenv.env[key]?.trim();
    if (v == null || v.isEmpty) return null;
    return v;
  }

  /// Production site serves the API on www; apex redirects break some verbs from Flutter.
  static String normalizeApiUrl(String raw) {
    var url = raw.trim().replaceAll(RegExp(r'/+$'), '');
    if (url.isEmpty) return 'https://www.mygarage.ug';
    try {
      final uri = Uri.parse(url);
      final host = uri.host.toLowerCase();
      if (host == 'mygarage.ug' || host == 'mygarage.ug.') {
        url = uri
            .replace(scheme: 'https', host: 'www.mygarage.ug')
            .toString()
            .replaceAll(RegExp(r'/+$'), '');
      }
    } catch (_) {
      /* keep url */
    }
    return url;
  }

  ///
  /// Priority:
  /// 1. `--dart-define=API_URL=...` (compile-time)
  /// 2. Flutter **web** → always local Next (`http://localhost:3000`)
  /// 3. `assets/app.env` / production defaults for native
  ///
  static String get apiUrl {
    const fromDefine = String.fromEnvironment('API_URL');
    if (fromDefine.isNotEmpty) {
      return normalizeApiUrl(fromDefine);
    }

    // Browser must never use a phone-LAN IP from an old build.
    if (kIsWeb) {
      return 'http://localhost:3000';
    }

    final value = _env('API_URL') ?? _env('EXPO_PUBLIC_API_URL');
    if (value == null) {
      return 'https://www.mygarage.ug';
    }
    return normalizeApiUrl(value);
  }

  static String get supabaseUrl =>
      _env('SUPABASE_URL') ?? _env('EXPO_PUBLIC_SUPABASE_URL') ?? '';

  static String get supabaseAnonKey =>
      _env('SUPABASE_ANON_KEY') ?? _env('EXPO_PUBLIC_SUPABASE_ANON_KEY') ?? '';

  static String get googleMapsApiKey =>
      _env('GOOGLE_MAPS_API_KEY') ??
      _env('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY') ??
      '';

  static String get authDeepLinkUri {
    return _env('AUTH_DEEP_LINK_URI') ?? 'mygarage://login-callback';
  }

  static String get authHttpsRedirectUri {
    final explicit =
        _env('AUTH_REDIRECT_URI') ?? _env('EXPO_PUBLIC_AUTH_REDIRECT_URI');
    if (explicit != null) {
      if (explicit.startsWith('http://') || explicit.startsWith('https://')) {
        return normalizeApiUrl(explicit);
      }
    }
    return '$apiUrl/auth/mobile-callback';
  }

  static bool get isSupabaseConfigured =>
      supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;

  static const String appName = 'MyGarage';
  static const String appTagline = 'Parts, services, garage';
}
