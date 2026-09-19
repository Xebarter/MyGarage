// ignore_for_file: avoid_web_libraries_in_flutter, deprecated_member_use
import 'dart:html' as html;
import 'dart:js_util' as js_util;

void Function() listenForHostedPaymentReturn(
  void Function(Map<String, dynamic> payload) onReturn,
) {
  final sub = html.window.onMessage.listen((event) {
    final raw = js_util.dartify(event.data);
    if (raw is! Map) return;
    final payload = Map<String, dynamic>.from(raw);
    if (payload['source'] != 'mygarage-payment') return;
    onReturn(payload);
  });
  return () {
    sub.cancel();
  };
}
