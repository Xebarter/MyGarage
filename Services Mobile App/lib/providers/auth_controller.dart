import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../api/api_client.dart';
import '../api/vendor_api.dart';
import '../auth/google_auth.dart';
import '../config.dart';
import '../models/vendor_profile.dart';
import '../utils/user_facing_error.dart';

enum AuthStatus { unknown, unauthenticated, pendingVerification, authenticated }

class AuthController extends ChangeNotifier {
  AuthController({ApiClient? apiClient})
      : _vendorApi = VendorApi(apiClient ?? ApiClient()) {
    _init();
  }

  final VendorApi _vendorApi;
  AuthStatus status = AuthStatus.unknown;
  User? user;
  VendorProfile? vendor;
  /// Only set for intentional auth actions (sign-in failures), not background recovery.
  String? errorMessage;
  bool busy = false;

  String? get vendorId => user?.id;

  Future<void> _init() async {
    if (!AppConfig.isSupabaseConfigured) {
      status = AuthStatus.unauthenticated;
      errorMessage = 'Sign-in is not configured for this build.';
      notifyListeners();
      return;
    }

    final client = Supabase.instance.client;
    // Session is restored from secure storage by Supabase.initialize / onAuthStateChange.
    user = client.auth.currentUser;
    client.auth.onAuthStateChange.listen((data) async {
      final event = data.event;
      user = data.session?.user;

      if (user == null) {
        vendor = null;
        // Token refresh failures can emit signedOut briefly — treat as unauthenticated only
        // when we truly signed out.
        if (event == AuthChangeEvent.signedOut) {
          status = AuthStatus.unauthenticated;
          notifyListeners();
        }
        return;
      }

      // Refresh success / initial session — reload vendor quietly.
      await refreshVendor(quiet: true);
    });

    if (user != null) {
      await refreshVendor(quiet: true);
    } else {
      // Give storage restore a moment (initialSession fires shortly after init).
      await Future<void>.delayed(const Duration(milliseconds: 80));
      user = client.auth.currentUser;
      if (user != null) {
        await refreshVendor(quiet: true);
      } else {
        status = AuthStatus.unauthenticated;
        notifyListeners();
      }
    }
  }

  /// Soft resume: refresh token if needed and reload vendor without flashing errors.
  Future<void> onAppResumed() async {
    if (!AppConfig.isSupabaseConfigured) return;
    try {
      final session = Supabase.instance.client.auth.currentSession;
      if (session != null) {
        final expiresAt = session.expiresAt;
        final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
        // Refresh when expired or near expiry.
        if (expiresAt == null || expiresAt <= now + 60) {
          try {
            await Supabase.instance.client.auth.refreshSession();
          } catch (_) {
            /* keep existing session until truly invalid */
          }
        }
      }
      user = Supabase.instance.client.auth.currentUser;
      if (user != null) {
        await refreshVendor(quiet: true);
      }
    } catch (_) {
      // Keep last known auth state on flaky network.
    }
  }

  Future<void> signIn(String email, String password) async {
    busy = true;
    errorMessage = null;
    notifyListeners();
    try {
      final res = await Supabase.instance.client.auth.signInWithPassword(
        email: email.trim(),
        password: password,
      );
      user = res.user;
      await _vendorApi.bootstrap();
      await refreshVendor();
    } on AuthException catch (e) {
      errorMessage = e.message;
      status = AuthStatus.unauthenticated;
    } catch (e) {
      errorMessage = userFacingError(e, fallback: 'Could not sign in. Please try again.');
      status = AuthStatus.unauthenticated;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  /// Opens Google OAuth in the browser. Session arrives via deep link + onAuthStateChange.
  Future<void> signInWithGoogle() async {
    busy = true;
    errorMessage = null;
    notifyListeners();
    try {
      await signInWithGoogleOAuth();
      if (!kIsWeb) {
        busy = false;
        notifyListeners();
        return;
      }
    } catch (e) {
      errorMessage = googleSignInErrorMessage(e);
      status = AuthStatus.unauthenticated;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<void> refreshVendor({bool quiet = false}) async {
    final id = user?.id;
    if (id == null) {
      status = AuthStatus.unauthenticated;
      notifyListeners();
      return;
    }

    try {
      try {
        await _vendorApi.bootstrap();
      } catch (_) {
        // Bootstrap may already exist; continue to load profile.
      }
      vendor = await _vendorApi.getVendor(id);
      status = vendor!.servicesVerified
          ? AuthStatus.authenticated
          : AuthStatus.pendingVerification;
      if (!quiet) errorMessage = null;
    } catch (e) {
      if (isTransientNetworkError(e)) {
        // Keep previous gate status if we already knew verification result.
        if (status == AuthStatus.unknown) {
          status = AuthStatus.authenticated;
        }
        if (!quiet) {
          // Don't pollute auth.errorMessage with network noise on silent recovery paths.
        }
      } else {
        // Profile load failed for a real reason — assume pending rather than sign-out.
        status = AuthStatus.pendingVerification;
        if (!quiet) {
          errorMessage = userFacingError(e, fallback: 'Could not load your provider profile.');
        }
      }
    }
    notifyListeners();
  }

  Future<void> updateProfile({
    required String name,
    required String phone,
    required String address,
    String? imageUrl,
    List<int>? avatarBytes,
    String? avatarFilename,
    String avatarContentType = 'image/jpeg',
  }) async {
    if (vendorId == null) return;
    busy = true;
    notifyListeners();
    try {
      var resolvedImageUrl = imageUrl;
      if (avatarBytes != null && avatarBytes.isNotEmpty) {
        resolvedImageUrl = await _vendorApi.uploadAvatar(
          bytes: avatarBytes,
          filename: avatarFilename ?? 'avatar.jpg',
          contentType: avatarContentType,
        );
      }

      final body = <String, dynamic>{
        'name': name.trim(),
        'phone': phone.trim(),
        'address': address.trim(),
      };
      if (resolvedImageUrl != null) {
        body['imageUrl'] = resolvedImageUrl;
      }

      vendor = await _vendorApi.updateProfile(body);
      errorMessage = null;
    } catch (e) {
      errorMessage = userFacingError(e, fallback: 'Could not save profile.');
      rethrow;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<void> signOut() async {
    try {
      await Supabase.instance.client.auth.signOut();
    } catch (_) {
      /* still clear local state */
    }
    user = null;
    vendor = null;
    errorMessage = null;
    status = AuthStatus.unauthenticated;
    notifyListeners();
  }
}
