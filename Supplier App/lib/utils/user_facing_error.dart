import '../api/api_client.dart';

/// True when the exception looks like offline / DNS / transport failure.
bool isTransientNetworkError(Object error) {
  final s = error.toString().toLowerCase();
  return s.contains('socket') ||
      s.contains('network') ||
      s.contains('timed out') ||
      s.contains('timeout') ||
      s.contains('connection') ||
      s.contains('failed host lookup') ||
      s.contains('no address associated') ||
      s.contains('connection refused') ||
      s.contains('connection reset') ||
      s.contains('software caused connection abort') ||
      s.contains('clientexception') ||
      s.contains('xmlhttprequest') ||
      s.contains('errno = 7') ||
      s.contains('errno=7') ||
      (error is ApiException &&
          (error.statusCode == null ||
              error.statusCode == 408 ||
              error.statusCode == 429 ||
              (error.statusCode != null && error.statusCode! >= 500)));
}

/// Human-readable text for operator-facing UI (never stack traces / host lookup dumps).
String userFacingError(Object error, {String fallback = 'Something went wrong. Please try again.'}) {
  if (isTransientNetworkError(error)) {
    return "You're offline. Pull to refresh when connection returns.";
  }

  if (error is ApiException) {
    final msg = error.message.trim();
    if (msg.isEmpty || _looksTechnical(msg)) return fallback;
    return msg;
  }

  var raw = error.toString().trim();
  raw = raw
      .replaceFirst(
        RegExp(r'^(Exception|Error|ApiException|ClientException|SocketException|HttpException):\s*', caseSensitive: false),
        '',
      )
      .trim();

  if (raw.isEmpty || _looksTechnical(raw)) return fallback;
  // Strip trailing technical url fragments if any slipped through.
  raw = raw.replaceAll(RegExp(r',\s*url=https?://\S+', caseSensitive: false), '');
  if (_looksTechnical(raw)) return fallback;
  return raw;
}

bool _looksTechnical(String msg) {
  final s = msg.toLowerCase();
  return s.contains('socketexception') ||
      s.contains('clientexception') ||
      s.contains('failed host lookup') ||
      s.contains('no address associated') ||
      s.contains('errno') ||
      s.contains('http://') ||
      s.contains('https://') ||
      s.contains('stacktrace') ||
      s.contains('#0 ') ||
      s.contains('package:') ||
      s.contains('vendorid=') ||
      s.contains('url=') ||
      s.startsWith('instance of') ||
      RegExp(r'\b(econn|eai_again)\b').hasMatch(s) ||
      RegExp(r'request failed \(\d+\)').hasMatch(s);
}
