import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../api/api_client.dart';
import '../api/buyer_api.dart';
import '../auth/google_auth.dart';
import '../config.dart';
import '../models/models.dart';
import '../utils/user_facing_error.dart';

enum AuthStatus { unknown, unauthenticated, authenticated }

class AuthController extends ChangeNotifier {
  AuthController({ApiClient? apiClient})
      : _buyerApi = BuyerApi(apiClient ?? ApiClient()) {
    _init();
  }

  final BuyerApi _buyerApi;

  AuthStatus status = AuthStatus.unknown;
  User? user;
  BuyerProfile? profile;
  String? errorMessage;
  bool busy = false;

  String? get customerId => profile?.id;
  bool get configured => AppConfig.isSupabaseConfigured;

  Future<void> _init() async {
    if (!AppConfig.isSupabaseConfigured) {
      status = AuthStatus.unauthenticated;
      notifyListeners();
      return;
    }

    final client = Supabase.instance.client;
    user = client.auth.currentUser;

    client.auth.onAuthStateChange.listen((data) async {
      final event = data.event;
      user = data.session?.user;
      if (user == null) {
        profile = null;
        if (event == AuthChangeEvent.signedOut) {
          status = AuthStatus.unauthenticated;
          notifyListeners();
        }
        return;
      }
      await refreshProfile(quiet: true);
    });

    if (user != null) {
      await refreshProfile(quiet: true);
    } else {
      await Future<void>.delayed(const Duration(milliseconds: 80));
      user = client.auth.currentUser;
      if (user != null) {
        await refreshProfile(quiet: true);
      } else {
        status = AuthStatus.unauthenticated;
        notifyListeners();
      }
    }
  }

  Future<void> onAppResumed() async {
    if (!AppConfig.isSupabaseConfigured) return;
    try {
      final session = Supabase.instance.client.auth.currentSession;
      if (session != null) {
        final expiresAt = session.expiresAt;
        final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
        if (expiresAt == null || expiresAt <= now + 60) {
          try {
            await Supabase.instance.client.auth.refreshSession();
          } catch (_) {}
        }
      }
      user = Supabase.instance.client.auth.currentUser;
      if (user != null) await refreshProfile(quiet: true);
    } catch (_) {}
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
      await refreshProfile();
    } on AuthException catch (e) {
      errorMessage = e.message;
      status = AuthStatus.unauthenticated;
    } catch (e) {
      errorMessage = userFacingError(e, fallback: 'Could not sign in.');
      status = AuthStatus.unauthenticated;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<void> signUp(String email, String password, String name) async {
    busy = true;
    errorMessage = null;
    notifyListeners();
    try {
      final res = await Supabase.instance.client.auth.signUp(
        email: email.trim(),
        password: password,
        data: {'full_name': name.trim(), 'name': name.trim()},
      );
      user = res.user;
      await refreshProfile();
    } on AuthException catch (e) {
      errorMessage = e.message;
      status = AuthStatus.unauthenticated;
    } catch (e) {
      errorMessage = userFacingError(e, fallback: 'Could not create account.');
      status = AuthStatus.unauthenticated;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

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
      errorMessage = userFacingError(e, fallback: 'Google sign-in failed.');
      status = AuthStatus.unauthenticated;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<void> refreshProfile({bool quiet = false}) async {
    final current = user;
    final email = current?.email;
    if (current == null || email == null || email.isEmpty) {
      status = AuthStatus.unauthenticated;
      profile = null;
      notifyListeners();
      return;
    }

    try {
      try {
        profile = await _buyerApi.fetchProfile(email: email);
      } catch (_) {
        final name = (current.userMetadata?['full_name'] as String?) ??
            (current.userMetadata?['name'] as String?) ??
            email.split('@').first;
        profile = await _buyerApi.createProfile(
          name: name,
          email: email,
          phone: (current.userMetadata?['phone'] as String?) ?? '',
        );
      }
      status = AuthStatus.authenticated;
      if (!quiet) errorMessage = null;
    } catch (e) {
      if (!quiet) {
        errorMessage = userFacingError(e, fallback: 'Could not load profile.');
      }
      // Still mark authenticated if session exists; profile can load later.
      status = AuthStatus.authenticated;
    }
    notifyListeners();
  }

  Future<void> signOut() async {
    try {
      await Supabase.instance.client.auth.signOut();
    } catch (_) {}
    user = null;
    profile = null;
    errorMessage = null;
    status = AuthStatus.unauthenticated;
    notifyListeners();
  }
}
