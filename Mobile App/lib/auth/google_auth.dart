import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart' show LaunchMode;

import '../config.dart';

/// Opens Google OAuth; session completes via deep link / auth state listener.
Future<void> signInWithGoogleOAuth() async {
  final redirectTo = AppConfig.authHttpsRedirectUri;
  await Supabase.instance.client.auth.signInWithOAuth(
    OAuthProvider.google,
    redirectTo: redirectTo,
    authScreenLaunchMode: LaunchMode.externalApplication,
  );
}
