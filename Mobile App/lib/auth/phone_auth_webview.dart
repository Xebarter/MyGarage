import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../config.dart';
import '../theme/app_theme.dart';
import '../utils/settle_keyboard.dart';
import '../widgets/app_brand_logo.dart';

bool get supportsInAppPhoneAuthWebView {
  if (kIsWeb) return false;
  switch (defaultTargetPlatform) {
    case TargetPlatform.android:
    case TargetPlatform.iOS:
    case TargetPlatform.macOS:
      return true;
    default:
      return false;
  }
}

Uri hostedPhoneAuthUri({required String e164, required String role}) {
  return Uri.parse('${AppConfig.apiUrl}/auth/phone').replace(
    queryParameters: {
      'phone': e164,
      'role': role,
      'channel': 'webview',
    },
  );
}

class HostedPhoneAuthResult {
  const HostedPhoneAuthResult({this.idToken, this.refreshToken});

  final String? idToken;
  final String? refreshToken;

  bool get isEmpty {
    final id = idToken?.trim() ?? '';
    final refresh = refreshToken?.trim() ?? '';
    return id.isEmpty && refresh.isEmpty;
  }
}

String? phoneIdTokenFromUri(Uri uri) {
  final fromQuery = uri.queryParameters['phone_id_token']?.trim() ?? '';
  if (fromQuery.isNotEmpty) return fromQuery;
  final fragment = uri.fragment;
  if (fragment.contains('phone_id_token=')) {
    final parsed = Uri.splitQueryString(
      fragment.startsWith('?') ? fragment.substring(1) : fragment,
    );
    final fromHash = parsed['phone_id_token']?.trim() ?? '';
    if (fromHash.isNotEmpty) return fromHash;
  }
  return null;
}

const _sessionHookJs = r'''
(function() {
  if (window.__mygaragePhoneHook) return;
  window.__mygaragePhoneHook = true;
  var orig = window.fetch;
  window.fetch = async function() {
    var res = await orig.apply(this, arguments);
    try {
      var raw = arguments[0];
      var url = '';
      if (typeof raw === 'string') url = raw;
      else if (raw && raw.url) url = String(raw.url);
      if (url.indexOf('/api/auth/phone/session') !== -1 && window.MyGaragePhoneAuth) {
        var body = await res.clone().json();
        if (body && (body.refresh_token || body.idToken)) {
          window.MyGaragePhoneAuth.postMessage(JSON.stringify({
            source: 'mygarage-phone-auth',
            idToken: body.idToken || '',
            refreshToken: body.refresh_token || ''
          }));
        }
      }
    } catch (e) {}
    return res;
  };
})();
''';

/// Opens the production phone + reCAPTCHA flow inside the app.
Future<HostedPhoneAuthResult?> openHostedPhoneAuth(
  BuildContext context, {
  required String e164,
  String role = 'buyer',
}) async {
  await settleKeyboard();
  if (!context.mounted) return null;
  if (!supportsInAppPhoneAuthWebView) {
    throw Exception(
      'Phone sign-in needs the MyGarage Android or iOS app. Try Google or email on this device.',
    );
  }
  return Navigator.of(context, rootNavigator: true).push<HostedPhoneAuthResult>(
    MaterialPageRoute(
      fullscreenDialog: true,
      builder: (_) => PhoneAuthWebViewScreen(e164: e164, role: role),
    ),
  );
}

class PhoneAuthWebViewScreen extends StatefulWidget {
  const PhoneAuthWebViewScreen({
    super.key,
    required this.e164,
    this.role = 'buyer',
  });

  final String e164;
  final String role;

  @override
  State<PhoneAuthWebViewScreen> createState() => _PhoneAuthWebViewScreenState();
}

class _PhoneAuthWebViewScreenState extends State<PhoneAuthWebViewScreen> {
  late final WebViewController _controller;
  var _loading = true;
  var _finishing = false;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(AppColors.background)
      ..addJavaScriptChannel(
        'MyGaragePhoneAuth',
        onMessageReceived: (message) => _onBridgeMessage(message.message),
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onNavigationRequest: (request) {
            final uri = Uri.tryParse(request.url);
            if (uri != null && _finishIfDeepLink(uri)) {
              return NavigationDecision.prevent;
            }
            return NavigationDecision.navigate;
          },
          onPageStarted: (url) {
            final uri = Uri.tryParse(url);
            if (uri != null) _finishIfDeepLink(uri);
            if (mounted) setState(() => _loading = true);
          },
          onPageFinished: (_) async {
            try {
              await _controller.runJavaScript(_sessionHookJs);
            } catch (_) {}
            if (mounted) setState(() => _loading = false);
          },
          onUrlChange: (change) {
            final url = change.url;
            if (url == null) return;
            final uri = Uri.tryParse(url);
            if (uri != null) _finishIfDeepLink(uri);
          },
          onWebResourceError: (_) {
            if (mounted) setState(() => _loading = false);
          },
        ),
      )
      ..loadRequest(hostedPhoneAuthUri(e164: widget.e164, role: widget.role));
  }

  void _onBridgeMessage(String raw) {
    final trimmed = raw.trim();
    if (trimmed.isEmpty) return;
    try {
      final data = jsonDecode(trimmed);
      if (data is Map) {
        final error = data['error']?.toString().trim() ?? '';
        if (error.isNotEmpty) return;
        _finish(
          HostedPhoneAuthResult(
            idToken: data['idToken']?.toString(),
            refreshToken: data['refreshToken']?.toString() ?? data['refresh_token']?.toString(),
          ),
        );
        return;
      }
    } catch (_) {}
    if (trimmed.contains('.') && trimmed.length > 40) {
      _finish(HostedPhoneAuthResult(idToken: trimmed));
    }
  }

  bool _finishIfDeepLink(Uri uri) {
    final token = phoneIdTokenFromUri(uri);
    if (token == null) return false;
    _finish(HostedPhoneAuthResult(idToken: token));
    return true;
  }

  void _finish(HostedPhoneAuthResult result) {
    if (_finishing || result.isEmpty) return;
    _finishing = true;
    if (!mounted) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      Navigator.of(context).pop(result);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const AppBarTitle('Sign in with phone'),
        leading: IconButton(
          tooltip: 'Close',
          onPressed: () => Navigator.of(context).maybePop(),
          icon: const Icon(Icons.close_rounded),
        ),
      ),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (_loading)
            const Align(
              alignment: Alignment.topCenter,
              child: LinearProgressIndicator(minHeight: 2),
            ),
        ],
      ),
    );
  }
}
