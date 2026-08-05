import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../config.dart';

/// OAuth redirect for Google sign-in.
///
/// - Web (Chrome): current origin.
/// - Native: HTTPS bridge on the MyGarage site, which deep-links back into the app.
///   Register `https://mygarage.ug/auth/services-mobile-callback` (and local API if needed)
///   under Supabase → Authentication → URL Configuration → Redirect URLs.
String googleAuthRedirectTo() {
  if (kIsWeb) {
    return Uri.base.origin;
  }
  return AppConfig.authHttpsRedirectUri;
}

Future<bool> signInWithGoogleOAuth() async {
  if (!AppConfig.isSupabaseConfigured) {
    throw Exception('Supabase is not configured.');
  }

  final redirectTo = googleAuthRedirectTo();
  final launched = await Supabase.instance.client.auth.signInWithOAuth(
    OAuthProvider.google,
    redirectTo: redirectTo,
    authScreenLaunchMode: kIsWeb ? LaunchMode.platformDefault : LaunchMode.externalApplication,
    queryParams: const {
      'prompt': 'select_account',
    },
  );

  if (!launched) {
    throw Exception('Could not open Google sign-in.');
  }
  return launched;
}

String googleSignInErrorMessage(Object error) {
  final message = error is AuthException ? error.message : error.toString();
  if (RegExp(r'oauth|provider|google|redirect|invalid_request', caseSensitive: false)
      .hasMatch(message)) {
    return 'Google sign-in failed. Add ${AppConfig.authHttpsRedirectUri} '
        'to Supabase Redirect URLs.';
  }
  if (message.toLowerCase().contains('cancel')) {
    return 'Google sign-in was cancelled.';
  }
  return message.isEmpty ? 'Google sign-in failed.' : message;
}
