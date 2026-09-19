import 'payment_return_listener_stub.dart'
    if (dart.library.html) 'payment_return_listener_web.dart' as impl;

void Function() listenForHostedPaymentReturn(
  void Function(Map<String, dynamic> payload) onReturn,
) {
  return impl.listenForHostedPaymentReturn(onReturn);
}
