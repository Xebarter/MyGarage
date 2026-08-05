import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../api/api_client.dart';
import '../api/vendor_api.dart';
import '../auth/google_auth.dart';
import '../config.dart';
import '../models/vendor_profile.dart';

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
  String? errorMessage;
  bool busy = false;

  String? get vendorId => user?.id;

  Future<void> _init() async {
    if (!AppConfig.isSupabaseConfigured) {
      status = AuthStatus.unauthenticated;
      errorMessage = 'Supabase is not configured. Add SUPABASE_URL and SUPABASE_ANON_KEY to .env';
      notifyListeners();
      return;
    }

    final client = Supabase.instance.client;
    user = client.auth.currentUser;
    client.auth.onAuthStateChange.listen((data) async {
      user = data.session?.user;
      if (user == null) {
        vendor = null;
        status = AuthStatus.unauthenticated;
        notifyListeners();
        return;
      }
      await refreshVendor();
    });

    if (user != null) {
      await refreshVendor();
    } else {
      status = AuthStatus.unauthenticated;
      notifyListeners();
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
      errorMessage = e.toString();
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
      // Native: browser leaves the app; session is applied when the deep link returns.
      // Do not treat "no session yet" as failure.
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

  Future<void> refreshVendor() async {
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
      errorMessage = null;
    } catch (e) {
      errorMessage = e.toString();
      status = AuthStatus.pendingVerification;
    }
    notifyListeners();
  }

  Future<void> updateProfile({
    required String name,
    required String phone,
    required String address,
  }) async {
    final id = vendorId;
    if (id == null) return;
    busy = true;
    notifyListeners();
    try {
      vendor = await _vendorApi.updateVendor(id, {
        'name': name.trim(),
        'phone': phone.trim(),
        'address': address.trim(),
      });
      errorMessage = null;
    } catch (e) {
      errorMessage = e.toString();
      rethrow;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<void> signOut() async {
    await Supabase.instance.client.auth.signOut();
    user = null;
    vendor = null;
    status = AuthStatus.unauthenticated;
    notifyListeners();
  }
}
