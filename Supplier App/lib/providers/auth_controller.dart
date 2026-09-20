import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../api/api_client.dart';
import '../api/vendor_api.dart';
import '../auth/google_auth.dart';
import '../auth/session_backup.dart';
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
  String? errorMessage;
  bool busy = false;
  VoidCallback? onSignedOut;
  bool _explicitSignOut = false;
  bool _recovering = false;
  String? _cachedUserId;

  String? get vendorId => user?.id ?? vendor?.id ?? _cachedUserId;

  Future<void> _init() async {
    if (!AppConfig.isSupabaseConfigured) {
      status = AuthStatus.unauthenticated;
      errorMessage = 'Sign-in is not configured for this build.';
      notifyListeners();
      return;
    }

    await _restoreCachedSession();

    final client = Supabase.instance.client;
    user = client.auth.currentUser ?? user;
    final session = client.auth.currentSession;
    if (session != null) {
      await SessionBackup.persistSession(session);
      _cachedUserId = session.user.id;
    }

    if (user != null || vendor != null || _cachedUserId != null) {
      _applySignedInStatus();
      notifyListeners();
      unawaited(refreshVendor(quiet: true));
    }

    client.auth.onAuthStateChange.listen((data) {
      unawaited(_onAuthEvent(data));
    });

    if (user == null && vendor == null && _cachedUserId == null) {
      status = AuthStatus.unauthenticated;
      notifyListeners();
    }
  }

  void _applySignedInStatus() {
    if (vendor != null) {
      status = vendor!.vendorVerified
          ? AuthStatus.authenticated
          : AuthStatus.pendingVerification;
    } else {
      status = AuthStatus.authenticated;
    }
  }

  Future<void> _onAuthEvent(AuthState data) async {
    final event = data.event;

    if (event == AuthChangeEvent.signedOut) {
      if (_explicitSignOut) {
        user = null;
        vendor = null;
        _cachedUserId = null;
        status = AuthStatus.unauthenticated;
        notifyListeners();
        return;
      }
      if (_recovering) return;
      await _recoverFromBackupIfNeeded();
      return;
    }

    final session = data.session ?? Supabase.instance.client.auth.currentSession;
    if (session?.user != null) {
      user = session!.user;
      _cachedUserId = user!.id;
      _explicitSignOut = false;
      await SessionBackup.persistSession(session);
      await refreshVendor(quiet: true);
      return;
    }

    if (event == AuthChangeEvent.initialSession && !_explicitSignOut) {
      if (await _recoverFromBackupIfNeeded()) return;
      if (vendor != null || _cachedUserId != null) {
        _applySignedInStatus();
        notifyListeners();
        return;
      }
      status = AuthStatus.unauthenticated;
      notifyListeners();
    }
  }

  Future<bool> _recoverFromBackupIfNeeded() async {
    if (_explicitSignOut || _recovering) return false;
    _recovering = true;
    try {
      final live = Supabase.instance.client.auth.currentSession;
      if (live?.user != null) {
        user = live!.user;
        _cachedUserId = user!.id;
        await SessionBackup.persistSession(live);
        await refreshVendor(quiet: true);
        return true;
      }

      final stay = await SessionBackup.staySignedIn();
      if (!stay && vendor == null && _cachedUserId == null) {
        return false;
      }

      final raw = await SessionBackup.readSessionJson();
      if (raw != null && raw.isNotEmpty) {
        try {
          await Supabase.instance.client.auth.recoverSession(raw);
        } catch (_) {
          try {
            await Supabase.instance.client.auth.setInitialSession(raw);
          } catch (_) {}
        }
        user = Supabase.instance.client.auth.currentUser ?? user;
        final restored = Supabase.instance.client.auth.currentSession;
        if (restored != null) {
          await SessionBackup.persistSession(restored);
        }
      }

      _cachedUserId = user?.id ?? _cachedUserId ?? await SessionBackup.readUserId();
      if (user != null || vendor != null || _cachedUserId != null) {
        _applySignedInStatus();
        notifyListeners();
        if (vendorId != null) {
          unawaited(refreshVendor(quiet: true));
        }
        return true;
      }
      return false;
    } finally {
      _recovering = false;
    }
  }

  Future<void> _restoreCachedSession() async {
    try {
      _cachedUserId = await SessionBackup.readUserId();
      final raw = await SessionBackup.readVendorJson();
      if (raw == null || raw.isEmpty) return;
      final map = jsonDecode(raw);
      if (map is! Map) return;
      vendor = VendorProfile.fromJson(Map<String, dynamic>.from(map));
      _cachedUserId ??= vendor!.id;
      _applySignedInStatus();
    } catch (_) {}
  }

  Future<void> _persistVendor() async {
    try {
      if (vendorId != null) {
        await SessionBackup.persistUserId(vendorId!);
      }
      if (vendor != null) {
        await SessionBackup.persistVendorJson(jsonEncode(vendor!.toJson()));
      }
    } catch (_) {}
  }

  Future<void> onAppResumed() async {
    if (!AppConfig.isSupabaseConfigured || _explicitSignOut) return;
    try {
      final session = Supabase.instance.client.auth.currentSession;
      if (session != null) {
        final expiresAt = session.expiresAt;
        final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
        if (expiresAt == null || expiresAt <= now + 60) {
          try {
            await Supabase.instance.client.auth.refreshSession();
          } catch (_) {
            await _recoverFromBackupIfNeeded();
          }
        }
      } else {
        await _recoverFromBackupIfNeeded();
      }
      user = Supabase.instance.client.auth.currentUser ?? user;
      if (vendorId != null) {
        await refreshVendor(quiet: true);
      }
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
      _explicitSignOut = false;
      if (res.session != null) {
        await SessionBackup.persistSession(res.session!);
      }
      _cachedUserId = user?.id ?? _cachedUserId;
      await _vendorApi.bootstrap();
      await refreshVendor();
    } on AuthException catch (e) {
      errorMessage = e.message;
      if (vendorId == null) status = AuthStatus.unauthenticated;
    } catch (e) {
      errorMessage = userFacingError(e, fallback: 'Could not sign in. Please try again.');
      if (vendorId == null) status = AuthStatus.unauthenticated;
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
      errorMessage = googleSignInErrorMessage(e);
      if (vendorId == null) status = AuthStatus.unauthenticated;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<void> refreshVendor({bool quiet = false}) async {
    final id = vendorId;
    if (id == null) {
      if (_explicitSignOut) {
        status = AuthStatus.unauthenticated;
        notifyListeners();
      }
      return;
    }

    try {
      try {
        await _vendorApi.bootstrap();
      } catch (_) {}
      vendor = await _vendorApi.getVendor(id);
      status = vendor!.vendorVerified
          ? AuthStatus.authenticated
          : AuthStatus.pendingVerification;
      if (!quiet) errorMessage = null;
      await _persistVendor();
    } catch (e) {
      if (isTransientNetworkError(e)) {
        if (vendor != null) {
          _applySignedInStatus();
        } else if (status == AuthStatus.unknown) {
          status = AuthStatus.authenticated;
        }
      } else if (vendor != null) {
        _applySignedInStatus();
      } else {
        status = AuthStatus.pendingVerification;
        if (!quiet) {
          errorMessage = userFacingError(e, fallback: 'Could not load your supplier profile.');
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
      await _persistVendor();
    } catch (e) {
      errorMessage = userFacingError(e, fallback: 'Could not save profile.');
      rethrow;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<void> signOut() async {
    _explicitSignOut = true;
    await SessionBackup.clear();
    try {
      await Supabase.instance.client.auth.signOut(scope: SignOutScope.local);
    } catch (_) {}
    try {
      await Supabase.instance.client.auth.signOut(scope: SignOutScope.global);
    } catch (_) {}
    user = null;
    vendor = null;
    _cachedUserId = null;
    errorMessage = null;
    status = AuthStatus.unauthenticated;
    notifyListeners();
    onSignedOut?.call();
  }
}
