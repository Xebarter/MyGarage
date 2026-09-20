import 'package:flutter_dotenv/flutter_dotenv.dart';

class AppConfig {
  AppConfig._();

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

  static String get apiUrl {
    final raw = dotenv.env['API_URL']?.trim();
    if (raw == null || raw.isEmpty) return 'https://www.mygarage.ug';
    return normalizeApiUrl(raw);
  }

  static String get supabaseUrl => dotenv.env['SUPABASE_URL']?.trim() ?? '';

  static String get supabaseAnonKey => dotenv.env['SUPABASE_ANON_KEY']?.trim() ?? '';

  /// Custom scheme the HTTPS OAuth bridge opens to return into the native app.
  static String get authDeepLinkUri {
    final raw = dotenv.env['AUTH_DEEP_LINK_URI']?.trim();
    if (raw != null && raw.isNotEmpty) return raw;
    return 'ug.mygarage.supplier://login-callback';
  }

  /// HTTPS redirect registered in Supabase. The web page then opens [authDeepLinkUri].
  static String get authHttpsRedirectUri {
    final explicit = dotenv.env['AUTH_REDIRECT_URI']?.trim();
    if (explicit != null && explicit.isNotEmpty) {
      if (explicit.startsWith('http://') || explicit.startsWith('https://')) {
        return normalizeApiUrl(explicit);
      }
    }
    return '$apiUrl/auth/supplier-mobile-callback';
  }

  static String get authRedirectUri => authDeepLinkUri;

  static bool get isSupabaseConfigured =>
      supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;

  static const String appName = 'MyGarage';
  static const String appTagline = 'Products for suppliers';
}
