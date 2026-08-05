import 'package:flutter_dotenv/flutter_dotenv.dart';

class AppConfig {
  AppConfig._();

  static String get apiUrl {
    final raw = dotenv.env['API_URL']?.trim();
    if (raw == null || raw.isEmpty) return 'https://mygarage.ug';
    return raw.replaceAll(RegExp(r'/+$'), '');
  }

  static String get supabaseUrl => dotenv.env['SUPABASE_URL']?.trim() ?? '';

  static String get supabaseAnonKey => dotenv.env['SUPABASE_ANON_KEY']?.trim() ?? '';

  static String get googleMapsApiKey => dotenv.env['GOOGLE_MAPS_API_KEY']?.trim() ?? '';

  /// Custom scheme the HTTPS OAuth bridge opens to return into the native app.
  static String get authDeepLinkUri {
    final raw = dotenv.env['AUTH_DEEP_LINK_URI']?.trim();
    if (raw != null && raw.isNotEmpty) return raw;
    return 'ug.mygarage.services://login-callback';
  }

  /// HTTPS redirect registered in Supabase. The web page then opens [authDeepLinkUri].
  static String get authHttpsRedirectUri {
    final explicit = dotenv.env['AUTH_REDIRECT_URI']?.trim();
    if (explicit != null && explicit.isNotEmpty) {
      if (explicit.startsWith('http://') || explicit.startsWith('https://')) {
        return explicit.replaceAll(RegExp(r'/+$'), '');
      }
    }
    return '$apiUrl/auth/services-mobile-callback';
  }

  /// @Deprecated Prefer [authDeepLinkUri] / [authHttpsRedirectUri].
  static String get authRedirectUri => authDeepLinkUri;

  static bool get isSupabaseConfigured =>
      supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;

  static const String appName = 'MyGarage';
  static const String appTagline = 'Services for providers';
}
