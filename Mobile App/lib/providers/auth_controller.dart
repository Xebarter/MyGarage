import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../api/api_client.dart';
import '../api/buyer_api.dart';
import '../auth/auth_return_to.dart';
import '../auth/google_auth.dart';
import '../auth/phone.dart';
import '../auth/phone_auth_client.dart';
import '../auth/phone_auth_webview.dart';
import '../config.dart';
import '../models/models.dart';
import '../utils/user_facing_error.dart';

enum AuthStatus { unknown, unauthenticated, authenticated }

/// GoRouter must not refresh on every profile/busy notify — that resets the
/// StatefulShell back to the Services tab. Ping only when [AuthStatus] changes.
class AuthRouterRefresh extends ChangeNotifier {
  void ping() => notifyListeners();
}

class AuthController extends ChangeNotifier {
  AuthController({ApiClient? apiClient})
      : _buyerApi = BuyerApi(apiClient ?? ApiClient()) {
    _init();
  }

  final BuyerApi _buyerApi;
  final PhoneAuthClient _phoneAuth = PhoneAuthClient(role: 'buyer');
  final AuthRouterRefresh routerRefresh = AuthRouterRefresh();
  AuthStatus _routerStatus = AuthStatus.unknown;
  VoidCallback? onSignedOut;

  @override
  void notifyListeners() {
    super.notifyListeners();
    if (_routerStatus == status) return;
    _routerStatus = status;
    routerRefresh.ping();
  }

  AuthStatus status = AuthStatus.unknown;
  User? user;
  BuyerProfile? profile;
  String? errorMessage;
  bool busy = false;

  String? get customerId => profile?.id;
  bool get configured => AppConfig.isSupabaseConfigured;

  /// Signed-in mobile number from profile or phone-auth metadata.
  String get signedInPhone {
    final fromProfile = (profile?.phone ?? '').trim();
    if (fromProfile.isNotEmpty) return fromProfile;
    final fromUser = (user?.phone ?? user?.userMetadata?['phone'] as String? ?? '').trim();
    return fromUser;
  }

  bool get needsDisplayName {
    if (status != AuthStatus.authenticated) return false;
    return isPlaceholderDisplayName(
      profile?.name ?? '',
      phone: signedInPhone,
      email: profile?.email ?? user?.email ?? '',
    );
  }

  String get displayName {
    final name = (profile?.name ?? '').trim();
    if (isPlaceholderDisplayName(name, phone: signedInPhone, email: profile?.email ?? '')) {
      return '';
    }
    return name;
  }

  bool _pendingWelcome = false;
  bool _sessionWelcomeShown = false;
  bool _justCollectedName = false;
  String? _appliedPhoneIdToken;

  bool get shouldShowWelcome =>
      _pendingWelcome &&
      !_sessionWelcomeShown &&
      status == AuthStatus.authenticated &&
      !needsDisplayName &&
      displayName.isNotEmpty;

  bool get welcomeIsNewAccount => _justCollectedName;

  void markWelcomeShown() {
    _sessionWelcomeShown = true;
    _justCollectedName = false;
    notifyListeners();
  }

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
        emailRedirectTo: oauthRedirectTo(next: AuthReturnTo.pending),
      );
      user = res.user;
      if (res.session == null && user != null) {
        errorMessage =
            'Check your email to confirm this account, then return to the app to sign in.';
        status = AuthStatus.unauthenticated;
        return;
      }
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
      await signInWithGoogleOAuth(next: AuthReturnTo.pending);
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

  Future<void> _applyPhoneIdToken(String idToken, {bool pendingWelcome = true}) async {
    if (_appliedPhoneIdToken == idToken && user != null) return;
    _appliedPhoneIdToken = idToken;
    final refresh = await _buyerApi.exchangePhoneIdToken(idToken);
    await Supabase.instance.client.auth.setSession(refresh);
    user = Supabase.instance.client.auth.currentUser;
    await _phoneAuth.abort();
    if (pendingWelcome) {
      _pendingWelcome = true;
      _sessionWelcomeShown = false;
    }
    await refreshProfile();
  }

  Future<void> completeHostedPhoneToken(String idToken) async {
    final token = idToken.trim();
    if (token.isEmpty) return;
    if (status == AuthStatus.authenticated && user != null) return;
    busy = true;
    errorMessage = null;
    notifyListeners();
    try {
      await _applyPhoneIdToken(token, pendingWelcome: true);
    } catch (e) {
      errorMessage = phoneSignInErrorMessage(e);
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  /// Returns true when the SMS code must be entered in-app.
  /// Native Android/iOS complete the hosted recaptcha page and return false.
  Future<bool> sendPhoneOtp(String rawPhone, {BuildContext? host}) async {
    busy = true;
    errorMessage = null;
    notifyListeners();
    try {
      final phone = normalizeToE164(rawPhone);
      if (phone == null) {
        errorMessage = 'Enter a valid phone number.';
        return false;
      }
      if (!kIsWeb && host != null) {
        final hosted = await openHostedPhoneAuth(host, e164: phone, role: 'buyer');
        if (hosted == null || hosted.isEmpty) {
          return false;
        }
        final refresh = hosted.refreshToken?.trim() ?? '';
        if (refresh.isNotEmpty) {
          await Supabase.instance.client.auth.setSession(refresh);
          user = Supabase.instance.client.auth.currentUser;
          await _phoneAuth.abort();
          _pendingWelcome = true;
          _sessionWelcomeShown = false;
          await refreshProfile();
          return false;
        }
        final idToken = hosted.idToken?.trim() ?? '';
        if (idToken.isEmpty) {
          errorMessage = 'Could not complete phone sign-in.';
          return false;
        }
        await _applyPhoneIdToken(idToken, pendingWelcome: true);
        return false;
      }
      final started = await _phoneAuth.start(phone);
      if (started.awaitingSms) return true;
      final token = started.idToken;
      if (token == null || token.isEmpty) {
        errorMessage = 'Could not complete phone sign-in.';
        return false;
      }
      await _applyPhoneIdToken(token, pendingWelcome: true);
      return false;
    } catch (e) {
      errorMessage = phoneSignInErrorMessage(e);
      return false;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<void> verifyPhoneOtp({
    required String rawPhone,
    required String token,
  }) async {
    busy = true;
    errorMessage = null;
    notifyListeners();
    try {
      final phone = normalizeToE164(rawPhone);
      if (phone == null) {
        errorMessage = 'Enter a valid phone number.';
        status = AuthStatus.unauthenticated;
        return;
      }
      final code = token.replaceAll(RegExp(r'\D'), '');
      if (code.length < 6) {
        errorMessage = 'Enter the 6-digit code.';
        status = AuthStatus.unauthenticated;
        return;
      }
      final idToken = await _phoneAuth.confirmSmsCode(code);
      await _applyPhoneIdToken(idToken);
    } catch (e) {
      errorMessage = phoneSignInErrorMessage(e);
      status = AuthStatus.unauthenticated;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<BuyerProfile?> _loadExistingProfile(User current) async {
    try {
      return await _buyerApi.fetchProfile(customerId: current.id);
    } catch (_) {}
    final email = current.email?.trim() ?? '';
    if (email.isNotEmpty && !isPlaceholderEmail(email)) {
      try {
        return await _buyerApi.fetchProfile(email: email);
      } catch (_) {}
    }
    final phone = (current.phone ?? current.userMetadata?['phone'] as String? ?? '').trim();
    if (phone.isNotEmpty) {
      try {
        return await _buyerApi.fetchProfile(phone: phone);
      } catch (_) {}
    }
    return null;
  }

  Future<void> refreshProfile({bool quiet = false}) async {
    final current = user;
    if (current == null) {
      status = AuthStatus.unauthenticated;
      profile = null;
      notifyListeners();
      return;
    }

    final email = current.email?.trim() ?? '';
    final phone = (current.phone ?? current.userMetadata?['phone'] as String? ?? '').trim();
    if (email.isEmpty && phone.isEmpty) {
      status = AuthStatus.authenticated;
      notifyListeners();
      return;
    }

    try {
      profile = await _loadExistingProfile(current);
      if (profile == null) {
        final metaName = (current.userMetadata?['full_name'] as String?) ??
            (current.userMetadata?['name'] as String?) ??
            '';
        final name = isPlaceholderDisplayName(metaName, phone: phone, email: email)
            ? 'Customer'
            : metaName.trim();
        profile = await _buyerApi.createProfile(
          id: current.id,
          name: name.isEmpty ? 'Customer' : name,
          email: email.isNotEmpty ? email : placeholderEmailForPhone(phone),
          phone: phone,
        );
      } else if (phone.isNotEmpty && (profile!.phone).trim().isEmpty) {
        // Phone OTP is the source of truth — never leave the profile without it.
        profile = await _buyerApi.updateProfile(
          profile!.id,
          name: profile!.name,
          email: profile!.email,
          phone: phone,
          address: profile!.address,
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

  Future<void> updateLocalProfile(BuyerProfile next) async {
    profile = next;
    notifyListeners();
  }

  Future<void> saveDisplayName(String rawName) async {
    final trimmed = rawName.trim();
    if (trimmed.length < 2) {
      throw Exception('Enter your name.');
    }
    final current = user;
    if (current == null) throw Exception('Not signed in');

    await Supabase.instance.client.auth.updateUser(
      UserAttributes(
        data: {
          'full_name': trimmed,
          'name': trimmed,
          'given_name': firstGivenName(trimmed),
        },
      ),
    );
    user = Supabase.instance.client.auth.currentUser;

    if (profile == null) {
      final email = current.email?.trim() ?? '';
      final phone = signedInPhone;
      profile = await _buyerApi.createProfile(
        id: current.id,
        name: trimmed,
        email: email.isNotEmpty ? email : placeholderEmailForPhone(phone),
        phone: phone,
      );
    } else {
      await updateProfileFields(
        name: trimmed,
        phone: signedInPhone.isNotEmpty ? signedInPhone : profile!.phone,
        address: profile!.address,
      );
    }
    _justCollectedName = true;
    _pendingWelcome = true;
    _sessionWelcomeShown = false;
    notifyListeners();
  }

  Future<void> updateProfileFields({
    required String name,
    required String phone,
    String address = '',
  }) async {
    final current = profile;
    final email = user?.email ?? current?.email ?? '';
    if (current == null) {
      throw Exception('Not signed in');
    }
    busy = true;
    errorMessage = null;
    notifyListeners();
    try {
      profile = await _buyerApi.updateProfile(
        current.id,
        name: name.trim(),
        email: email,
        phone: phone.trim(),
        address: address.trim(),
      );
      errorMessage = null;
    } catch (e) {
      errorMessage = userFacingError(e, fallback: 'Could not update profile.');
      rethrow;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<void> changePassword(String newPassword) async {
    await Supabase.instance.client.auth.updateUser(
      UserAttributes(password: newPassword),
    );
  }

  Future<void> deleteAccount() async {
    final id = profile?.id;
    if (id == null || id.isEmpty) throw Exception('No profile');
    await _buyerApi.deleteProfile(id);
    await signOut();
  }

  Future<void> signOut() async {
    try {
      await Supabase.instance.client.auth.signOut();
    } catch (_) {}
    user = null;
    profile = null;
    errorMessage = null;
    status = AuthStatus.unauthenticated;
    _pendingWelcome = false;
    _sessionWelcomeShown = false;
    _justCollectedName = false;
    notifyListeners();
    onSignedOut?.call();
  }
}
