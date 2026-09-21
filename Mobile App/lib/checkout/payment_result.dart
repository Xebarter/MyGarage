import '../../providers/auth_controller.dart';
import '../../router/deep_links.dart';

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

  PaymentWebResult withFallback({
    String kind = '',
    String checkoutId = '',
    String requestId = '',
  }) {
    return PaymentWebResult(
      success: success,
      cancelled: cancelled,
      kind: this.kind.isNotEmpty ? this.kind : kind,
      checkoutId: this.checkoutId.isNotEmpty ? this.checkoutId : checkoutId,
      requestId: this.requestId.isNotEmpty ? this.requestId : requestId,
    );
  }
}

/// Lets a deep-link return close an in-app payment WebView that is still open.
class PaymentReturnBus {
  static final List<void Function(PaymentWebResult)> _listeners = [];

  static void emit(PaymentWebResult result) {
    for (final listener in List<void Function(PaymentWebResult)>.from(_listeners)) {
      listener(result);
    }
  }

  static void Function() listen(void Function(PaymentWebResult) onResult) {
    _listeners.add(onResult);
    return () => _listeners.remove(onResult);
  }
}

PaymentWebResult? parsePaymentReturnUri(Uri uri) {
  final kind = uri.queryParameters['kind'] ?? '';
  final checkoutId = uri.queryParameters['checkoutId'] ?? '';
  final requestId = uri.queryParameters['requestId'] ?? '';
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
