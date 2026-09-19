import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config.dart';

bool _isSafeNext(String? next) {
  if (next == null || next.isEmpty) return false;
  if (!next.startsWith('/')) return false;
  if (next.startsWith('//')) return false;
  return true;
}

/// Where Google / email-confirm should return.
///
/// Flutter web stays on this origin. Native uses the HTTPS bridge, which
/// deep-links back into the app (`mygarage://login-callback`).
String oauthRedirectTo({String? next}) {
  if (kIsWeb) {
    if (_isSafeNext(next)) {
      return Uri.parse('${Uri.base.origin}/login').replace(
        queryParameters: {'next': next},
      ).toString();
    }
    return '${Uri.base.origin}/login';
  }
  final base = Uri.parse(AppConfig.authHttpsRedirectUri);
  if (!_isSafeNext(next)) return base.toString();
  return base.replace(
    queryParameters: {
      ...base.queryParameters,
      'next': next!,
    },
  ).toString();
}

Future<bool> signInWithGoogleOAuth({String? next}) async {
  if (!AppConfig.isSupabaseConfigured) {
    throw Exception('Supabase is not configured.');
  }

  final launched = await Supabase.instance.client.auth.signInWithOAuth(
    OAuthProvider.google,
    redirectTo: oauthRedirectTo(next: next),
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
