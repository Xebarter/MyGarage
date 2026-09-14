import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config.dart';

/// Where Google / email-confirm should return.
///
/// Flutter web stays on this origin. Native uses the HTTPS bridge, which
/// deep-links back into the app (`mygarage://login-callback`).
String oauthRedirectTo() {
  if (kIsWeb) {
    return '${Uri.base.origin}/login';
  }
  return AppConfig.authHttpsRedirectUri;
}

Future<bool> signInWithGoogleOAuth() async {
  if (!AppConfig.isSupabaseConfigured) {
    throw Exception('Supabase is not configured.');
  }

  final launched = await Supabase.instance.client.auth.signInWithOAuth(
    OAuthProvider.google,
    redirectTo: oauthRedirectTo(),
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
