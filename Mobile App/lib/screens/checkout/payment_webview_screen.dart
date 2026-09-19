import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../api/api_client.dart';
import '../../api/buyer_api.dart';
import '../../providers/auth_controller.dart';
import '../../router/app_router.dart';
import '../../theme/app_theme.dart';
import '../../utils/payment_return_listener.dart';
import '../../utils/settle_keyboard.dart';
import '../../widgets/app_brand_logo.dart';

class PaymentWebResult {
  const PaymentWebResult({
    required this.success,
    required this.cancelled,
    this.kind = '',
    this.checkoutId = '',
    this.requestId = '',
  });

  factory PaymentWebResult.dismissed() =>
      const PaymentWebResult(success: false, cancelled: true);

  final bool success;
  final bool cancelled;
  final String kind;
  final String checkoutId;
  final String requestId;
}

PaymentWebResult? parsePaymentReturnUri(Uri uri) {
  final kind = uri.queryParameters['kind'] ?? '';
  final checkoutId = uri.queryParameters['checkoutId'] ?? '';
  final requestId = uri.queryParameters['requestId'] ?? '';

  if (uri.scheme == 'mygarage') {
    final key = myGarageDeepLinkKey(uri);
    if (key == 'checkout/complete') {
      return PaymentWebResult(
        success: true,
        cancelled: false,
        kind: kind,
        checkoutId: checkoutId,
        requestId: requestId,
      );
    }
    if (key == 'checkout/failed') {
      return PaymentWebResult(
        success: false,
        cancelled: uri.queryParameters['cancelled'] == '1',
        kind: kind,
        checkoutId: checkoutId,
        requestId: requestId,
      );
    }
    return null;
  }

  if (uri.scheme != 'http' && uri.scheme != 'https') return null;

  final path = uri.path.toLowerCase();
  if (path.contains('/payments/mobile-return')) {
    final status = (uri.queryParameters['status'] ?? '').toLowerCase();
    if (status == 'success') {
      return PaymentWebResult(
        success: true,
        cancelled: false,
        kind: kind,
        checkoutId: checkoutId,
        requestId: requestId,
      );
    }
    return PaymentWebResult(
      success: false,
      cancelled: status == 'cancel' || uri.queryParameters['cancelled'] == '1',
      kind: kind,
      checkoutId: checkoutId,
      requestId: requestId,
    );
  }
  if (path.contains('/payments/success')) {
    return PaymentWebResult(
      success: true,
      cancelled: false,
      kind: kind,
      checkoutId: checkoutId,
      requestId: requestId,
    );
  }
  if (path.contains('/payments/cancel')) {
    return PaymentWebResult(
      success: false,
      cancelled: true,
      kind: kind,
      checkoutId: checkoutId,
      requestId: requestId,
    );
  }
  if (path.contains('/payments/failure')) {
    return PaymentWebResult(
      success: false,
      cancelled: false,
      kind: kind,
      checkoutId: checkoutId,
      requestId: requestId,
    );
  }
  return null;
}

String paymentResultLocation(PaymentWebResult result, AuthController auth) {
  if (result.success) {
    if (result.kind == 'subscription') return '/profile/membership';
    if (result.kind == 'service') {
      if (result.requestId.isNotEmpty) return '/service/track/${result.requestId}';
      return '/profile/billing';
    }
    return auth.status == AuthStatus.authenticated ? '/orders' : '/login';
  }
  if (result.kind == 'subscription') return '/profile/membership';
  if (result.kind == 'service') {
    if (result.requestId.isNotEmpty) return '/service/track/${result.requestId}';
    return '/profile/billing';
  }
  return '/checkout';
}

bool get supportsInAppPaymentWebView {
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

Future<PaymentWebResult?> openHostedPayment(
  BuildContext context, {
  required String checkoutUrl,
  String title = 'Complete payment',
}) async {
  await settleKeyboard();
  if (!context.mounted) return null;
  final result = await Navigator.of(context, rootNavigator: true).push<PaymentWebResult>(
    MaterialPageRoute(
      fullscreenDialog: true,
      builder: (_) => supportsInAppPaymentWebView
          ? PaymentWebViewScreen(checkoutUrl: checkoutUrl, title: title)
          : PaymentBrowserHandoffScreen(checkoutUrl: checkoutUrl, title: title),
    ),
  );
  if (result != null &&
      result.success &&
      result.kind == 'subscription' &&
      result.checkoutId.isNotEmpty) {
    try {
      await BuyerApi(ApiClient()).activateSubscription(checkoutId: result.checkoutId);
    } catch (_) {}
  }
  return result;
}

/// Chrome / desktop: `webview_flutter` has no web implementation, so Paytota
/// opens in a browser tab and this screen waits for the buyer to finish.
class PaymentBrowserHandoffScreen extends StatefulWidget {
  const PaymentBrowserHandoffScreen({
    super.key,
    required this.checkoutUrl,
    this.title = 'Complete payment',
  });

  final String checkoutUrl;
  final String title;

  @override
  State<PaymentBrowserHandoffScreen> createState() => _PaymentBrowserHandoffScreenState();
}

class _PaymentBrowserHandoffScreenState extends State<PaymentBrowserHandoffScreen> {
  var _opening = true;
  var _openFailed = false;
  var _finishing = false;
  late final void Function() _stopListening;

  @override
  void initState() {
    super.initState();
    _stopListening = listenForHostedPaymentReturn(_onHostedReturn);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(_openCheckout());
    });
  }

  @override
  void dispose() {
    _stopListening();
    super.dispose();
  }

  void _onHostedReturn(Map<String, dynamic> payload) {
    final status = '${payload['status'] ?? ''}';
    _finish(
      PaymentWebResult(
        success: status == 'success',
        cancelled: payload['cancelled'] == true || status == 'cancel',
        kind: '${payload['kind'] ?? ''}',
        checkoutId: '${payload['checkoutId'] ?? ''}',
        requestId: '${payload['requestId'] ?? ''}',
      ),
    );
  }

  Future<void> _openCheckout() async {
    setState(() {
      _opening = true;
      _openFailed = false;
    });
    try {
      final uri = Uri.parse(widget.checkoutUrl);
      final ok = await launchUrl(
        uri,
        mode: LaunchMode.platformDefault,
        webOnlyWindowName: '_blank',
      );
      if (!mounted) return;
      setState(() {
        _opening = false;
        _openFailed = !ok;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _opening = false;
        _openFailed = true;
      });
    }
  }

  void _finish(PaymentWebResult result) {
    if (_finishing) return;
    _finishing = true;
    Navigator.of(context).pop(result);
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        _finish(PaymentWebResult.dismissed());
      },
      child: Scaffold(
        appBar: AppBar(
          title: AppBarTitle(widget.title),
          leading: IconButton(
            icon: const Icon(Icons.close),
            onPressed: () => _finish(PaymentWebResult.dismissed()),
          ),
        ),
        body: Padding(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 12),
              Text(
                _openFailed
                    ? 'Could not open the payment page.'
                    : _opening
                        ? 'Opening payment…'
                        : 'Finish payment in the new tab, then come back here.',
                style: AppTheme.host(fontSize: 18, fontWeight: FontWeight.w700, letterSpacing: -0.3),
              ),
              const SizedBox(height: 10),
              Text(
                'Finish in the payment tab. If that tab says the payment failed, tap Cancel here - do not tap I\'ve paid.',
                style: AppTheme.host(fontSize: 14, height: 1.4, color: AppColors.textSecondary),
              ),
              const Spacer(),
              if (_opening)
                const Center(child: CircularProgressIndicator())
              else ...[
                ElevatedButton(
                  onPressed: () => _finish(
                    const PaymentWebResult(success: true, cancelled: false),
                  ),
                  child: const Text("I've paid"),
                ),
                const SizedBox(height: 10),
                OutlinedButton(
                  onPressed: _openCheckout,
                  child: Text(_openFailed ? 'Try again' : 'Open payment again'),
                ),
                const SizedBox(height: 10),
                TextButton(
                  onPressed: () => _finish(PaymentWebResult.dismissed()),
                  child: const Text('Cancel'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class PaymentWebViewScreen extends StatefulWidget {
  const PaymentWebViewScreen({
    super.key,
    required this.checkoutUrl,
    this.title = 'Complete payment',
  });

  final String checkoutUrl;
  final String title;

  @override
  State<PaymentWebViewScreen> createState() => _PaymentWebViewScreenState();
}

class _PaymentWebViewScreenState extends State<PaymentWebViewScreen> {
  late final WebViewController _controller;
  var _loading = true;
  var _finishing = false;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(AppColors.background)
      ..setNavigationDelegate(
        NavigationDelegate(
          onNavigationRequest: (request) {
            final uri = Uri.tryParse(request.url);
            if (uri == null) return NavigationDecision.navigate;
            if (_finishIfReturn(uri)) return NavigationDecision.prevent;
            if (_openExternalIfNeeded(uri)) return NavigationDecision.prevent;
            return NavigationDecision.navigate;
          },
          onPageStarted: (url) {
            final uri = Uri.tryParse(url);
            if (uri != null) _finishIfReturn(uri);
            if (mounted) setState(() => _loading = true);
          },
          onPageFinished: (_) {
            if (mounted) setState(() => _loading = false);
          },
          onUrlChange: (change) {
            final url = change.url;
            if (url == null) return;
            final uri = Uri.tryParse(url);
            if (uri != null) _finishIfReturn(uri);
          },
          onWebResourceError: (_) {
            if (mounted) setState(() => _loading = false);
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.checkoutUrl));
  }

  bool _finishIfReturn(Uri uri) {
    if (_finishing) return true;
    final result = parsePaymentReturnUri(uri);
    if (result == null) return false;
    _finishing = true;
    if (mounted) Navigator.of(context).pop(result);
    return true;
  }

  bool _openExternalIfNeeded(Uri uri) {
    final scheme = uri.scheme.toLowerCase();
    if (scheme == 'http' ||
        scheme == 'https' ||
        scheme == 'about' ||
        scheme == 'data' ||
        scheme == 'blob') {
      return false;
    }
    launchUrl(uri, mode: LaunchMode.externalApplication);
    return true;
  }

  void _cancel() {
    if (_finishing) return;
    _finishing = true;
    Navigator.of(context).pop(PaymentWebResult.dismissed());
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        _cancel();
      },
      child: Scaffold(
        appBar: AppBar(
          title: AppBarTitle(widget.title),
          leading: IconButton(
            icon: const Icon(Icons.close),
            onPressed: _cancel,
          ),
        ),
        body: Stack(
          children: [
            WebViewWidget(controller: _controller),
            if (_loading)
              const LinearProgressIndicator(
                minHeight: 2,
                color: AppColors.primary,
              ),
          ],
        ),
      ),
    );
  }
}
