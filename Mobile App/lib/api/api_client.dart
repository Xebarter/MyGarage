import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config.dart';

class ApiException implements Exception {
  ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  /// Build a request URL, always on the canonical www host for production.
  Uri _uri(String path, [Map<String, String>? query]) {
    final normalized = path.startsWith('/') ? path : '/$path';
    // Prefer Uri construction so path segments encode correctly (e.g. listing ids).
    final base = Uri.parse(AppConfig.apiUrl);
    final pathOnly = normalized.split('?').first;
    final pathSegments = pathOnly
        .split('/')
        .where((s) => s.isNotEmpty)
        .map((s) {
          // Avoid double-encoding if the caller already encoded the segment.
          try {
            return Uri.decodeComponent(s);
          } catch (_) {
            return s;
          }
        })
        .toList();

    final url = Uri(
      scheme: base.scheme.isEmpty ? 'https' : base.scheme,
      host: base.host,
      port: base.hasPort ? base.port : null,
      pathSegments: pathSegments,
      queryParameters: query == null || query.isEmpty ? null : query,
    );
    return _canonicalHost(url);
  }

  /// Apex mygarage.ug → www (Vercel 308s apex and mobile clients often mishandle it).
  Uri _canonicalHost(Uri url) {
    final host = url.host.toLowerCase();
    if (host == 'mygarage.ug' || host == 'www.mygarage.ug') {
      return url.replace(scheme: 'https', host: 'www.mygarage.ug');
    }
    return url;
  }

  Future<Map<String, String>> _headers({bool auth = false, bool json = true}) async {
    final headers = <String, String>{
      'Accept': 'application/json',
    };
    if (json) {
      headers['Content-Type'] = 'application/json';
    }
    if (auth) {
      final token = Supabase.instance.client.auth.currentSession?.accessToken;
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }
    }
    return headers;
  }

  String? _redirectLocation(http.Response response) {
    // package:http lowercases header names, but keep fallbacks for safety.
    final direct = response.headers['location'] ?? response.headers['Location'];
    if (direct != null && direct.trim().isNotEmpty) return direct.trim();

    // Vercel sometimes also sends: refresh: 0;url=https://...
    final refresh = response.headers['refresh'] ?? response.headers['Refresh'];
    if (refresh == null || refresh.isEmpty) return null;
    final match = RegExp(r'url=(.+)$', caseSensitive: false).firstMatch(refresh);
    final url = match?.group(1)?.trim();
    if (url == null || url.isEmpty) return null;
    // Strip surrounding quotes if present.
    if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
      return url.substring(1, url.length - 1);
    }
    return url;
  }

  /// dart:io does not re-POST/DELETE across some 308 hops; follow manually and stay on www.
  Future<http.Response> _sendWithRedirects(
    String method,
    Uri url, {
    required Map<String, String> headers,
    Object? body,
    int maxRedirects = 5,
  }) async {
    var current = _canonicalHost(url);
    List<int>? bodyBytes;
    if (body is String) {
      bodyBytes = utf8.encode(body);
    } else if (body is List<int>) {
      bodyBytes = body;
    }

    for (var i = 0; i <= maxRedirects; i++) {
      final request = http.Request(method, current);
      request.headers.addAll(headers);
      if (bodyBytes != null) request.bodyBytes = bodyBytes;
      request.followRedirects = false;

      final streamed = await _client.send(request);
      final response = await http.Response.fromStream(streamed);

      final isRedirect = response.statusCode == 301 ||
          response.statusCode == 302 ||
          response.statusCode == 303 ||
          response.statusCode == 307 ||
          response.statusCode == 308;
      if (!isRedirect) return response;

      final location = _redirectLocation(response);
      Uri next;
      if (location != null && location.isNotEmpty) {
        next = _canonicalHost(current.resolve(location));
      } else if (current.host.toLowerCase() == 'mygarage.ug') {
        // No Location header (rare) — still escape apex → www.
        next = current.replace(scheme: 'https', host: 'www.mygarage.ug');
      } else {
        return response;
      }

      // Avoid infinite same-URL 308 loops.
      if (next.toString() == current.toString()) {
        return response;
      }
      current = next;

      // 303: method becomes GET and body dropped (standard).
      if (response.statusCode == 303) {
        return _sendWithRedirects(
          'GET',
          current,
          headers: headers,
          body: null,
          maxRedirects: maxRedirects - i - 1,
        );
      }
    }
    throw ApiException('Too many redirects for $method $url');
  }

  Future<T> get<T>(
    String path, {
    Map<String, String>? query,
    bool auth = false,
    T Function(dynamic json)? parser,
  }) async {
    final res = await _sendWithRedirects(
      'GET',
      _uri(path, query),
      headers: await _headers(auth: auth),
    );
    return _decode(res, parser: parser);
  }

  Future<T> post<T>(
    String path, {
    Object? body,
    bool auth = false,
    T Function(dynamic json)? parser,
  }) async {
    final res = await _sendWithRedirects(
      'POST',
      _uri(path),
      headers: await _headers(auth: auth),
      body: body == null ? null : jsonEncode(body),
    );
    return _decode(res, parser: parser);
  }

  Future<T> put<T>(
    String path, {
    Object? body,
    bool auth = false,
    T Function(dynamic json)? parser,
  }) async {
    final res = await _sendWithRedirects(
      'PUT',
      _uri(path),
      headers: await _headers(auth: auth),
      body: body == null ? null : jsonEncode(body),
    );
    return _decode(res, parser: parser);
  }

  Future<T> patch<T>(
    String path, {
    Object? body,
    bool auth = false,
    T Function(dynamic json)? parser,
  }) async {
    final res = await _sendWithRedirects(
      'PATCH',
      _uri(path),
      headers: await _headers(auth: auth),
      body: body == null ? null : jsonEncode(body),
    );
    return _decode(res, parser: parser);
  }

  Future<T> delete<T>(
    String path, {
    Map<String, String>? query,
    bool auth = false,
    T Function(dynamic json)? parser,
  }) async {
    final res = await _sendWithRedirects(
      'DELETE',
      _uri(path, query),
      headers: await _headers(auth: auth),
    );
    return _decode(res, parser: parser);
  }

  /// Multipart POST (e.g. file upload). Boundary Content-Type is set by [http.MultipartRequest].
  Future<T> postMultipart<T>(
    String path, {
    required List<http.MultipartFile> files,
    Map<String, String>? fields,
    bool auth = true,
    T Function(dynamic json)? parser,
    int maxRedirects = 5,
  }) async {
    var current = _canonicalHost(_uri(path));
    final baseHeaders = await _headers(auth: auth, json: false);

    for (var i = 0; i <= maxRedirects; i++) {
      final request = http.MultipartRequest('POST', current);
      request.headers.addAll(baseHeaders);
      if (fields != null) request.fields.addAll(fields);
      request.files.addAll(files);
      request.followRedirects = false;

      final streamed = await _client.send(request);
      final response = await http.Response.fromStream(streamed);

      final isRedirect = response.statusCode == 301 ||
          response.statusCode == 302 ||
          response.statusCode == 303 ||
          response.statusCode == 307 ||
          response.statusCode == 308;
      if (!isRedirect) {
        return _decode(response, parser: parser);
      }

      final location = _redirectLocation(response);
      Uri next;
      if (location != null && location.isNotEmpty) {
        next = _canonicalHost(current.resolve(location));
      } else if (current.host.toLowerCase() == 'mygarage.ug') {
        next = current.replace(scheme: 'https', host: 'www.mygarage.ug');
      } else {
        return _decode(response, parser: parser);
      }

      if (next.toString() == current.toString()) {
        return _decode(response, parser: parser);
      }
      current = next;

      if (response.statusCode == 303) {
        // Multipart bodies cannot be replayed as GET safely — treat as failure.
        return _decode(response, parser: parser);
      }
    }
    throw ApiException('Too many redirects for POST multipart $path');
  }

  T _decode<T>(http.Response res, {T Function(dynamic json)? parser}) {
    dynamic json;
    if (res.body.isNotEmpty) {
      try {
        json = jsonDecode(res.body);
      } catch (_) {
        json = {'error': res.body};
      }
    }

    if (res.statusCode < 200 || res.statusCode >= 300) {
      final message = json is Map && json['error'] != null
          ? json['error'].toString()
          : 'Request failed (${res.statusCode})';
      throw ApiException(message, statusCode: res.statusCode);
    }

    if (parser != null) return parser(json);
    return json as T;
  }
}
