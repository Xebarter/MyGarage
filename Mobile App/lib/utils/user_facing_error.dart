import '../api/api_client.dart';
import '../config.dart';

/// True when the exception looks like offline / DNS / transport failure.
bool isTransientNetworkError(Object error) {
  final s = error.toString().toLowerCase();
  // Real transport failures (not HTTP 5xx application errors).
  return s.contains('socket') ||
      s.contains('network is unreachable') ||
      s.contains('network_error') ||
      s.contains('timed out') ||
      s.contains('timeout') ||
      s.contains('failed host lookup') ||
      s.contains('no address associated') ||
      s.contains('connection refused') ||
      s.contains('connection reset') ||
      s.contains('connection aborted') ||
      s.contains('software caused connection abort') ||
      s.contains('clientexception') ||
      s.contains('xmlhttprequest') ||
      s.contains('errno = 7') ||
      s.contains('errno=7') ||
      (error is ApiException &&
          (error.statusCode == 408 || error.statusCode == 429));
}

/// Human-readable text for operator-facing UI (never stack traces / host lookup dumps).
String userFacingError(Object error, {String fallback = 'Something went wrong. Please try again.'}) {
  if (isTransientNetworkError(error)) {
    final s = error.toString().toLowerCase();
    final host = _apiHost();
    if (s.contains('connection refused') ||
        s.contains('failed host lookup') ||
        s.contains('no address associated') ||
        s.contains('network is unreachable')) {
      return 'Cannot reach the server ($host). Check API_URL and that the web API is online.';
    }
    if (s.contains('timed out') || s.contains('timeout')) {
      return 'The server took too long to respond ($host). Try again.';
    }
    return "You're offline. Pull to refresh when connection returns.";
  }

  if (error is ApiException) {
    final msg = error.message.trim();
    if (msg.isEmpty || _looksTechnical(msg)) {
      if (error.statusCode != null && error.statusCode! >= 500) {
        return 'Server error (${error.statusCode}). Please try again shortly.';
      }
      return fallback;
    }
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
  raw = raw.replaceAll(RegExp(r',\s*url=https?://\S+', caseSensitive: false), '');
  if (_looksTechnical(raw)) return fallback;
  return raw;
}

String _apiHost() {
  try {
    final host = Uri.parse(AppConfig.apiUrl).host;
    return host.isEmpty ? AppConfig.apiUrl : host;
  } catch (_) {
    return AppConfig.apiUrl;
  }
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
