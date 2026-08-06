import 'package:flutter/foundation.dart';
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
    // Support legacy Expo-style keys during migration.
    final legacy = dotenv.env['EXPO_PUBLIC_API_URL']?.trim();
    final value = (raw != null && raw.isNotEmpty) ? raw : legacy;
    if (value == null || value.isEmpty) {
      // Flutter *web* on localhost often wants a local Next server, not production.
      if (kIsWeb && kDebugMode) return 'http://localhost:3000';
      return 'https://www.mygarage.ug';
    }
    return normalizeApiUrl(value);
  }

  static String get supabaseUrl =>
      dotenv.env['SUPABASE_URL']?.trim() ??
      dotenv.env['EXPO_PUBLIC_SUPABASE_URL']?.trim() ??
      '';

  static String get supabaseAnonKey =>
      dotenv.env['SUPABASE_ANON_KEY']?.trim() ??
      dotenv.env['EXPO_PUBLIC_SUPABASE_ANON_KEY']?.trim() ??
      '';

  static String get googleMapsApiKey =>
      dotenv.env['GOOGLE_MAPS_API_KEY']?.trim() ??
      dotenv.env['EXPO_PUBLIC_GOOGLE_MAPS_API_KEY']?.trim() ??
      '';

  static String get authDeepLinkUri {
    final raw = dotenv.env['AUTH_DEEP_LINK_URI']?.trim();
    if (raw != null && raw.isNotEmpty) return raw;
    return 'mygarage://login-callback';
  }

  static String get authHttpsRedirectUri {
    final explicit = dotenv.env['AUTH_REDIRECT_URI']?.trim() ??
        dotenv.env['EXPO_PUBLIC_AUTH_REDIRECT_URI']?.trim();
    if (explicit != null && explicit.isNotEmpty) {
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
