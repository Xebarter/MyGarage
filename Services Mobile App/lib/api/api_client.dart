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

  Uri _uri(String path, [Map<String, String>? query]) {
    final normalized = path.startsWith('/') ? path : '/$path';
    return Uri.parse('${AppConfig.apiUrl}$normalized').replace(queryParameters: query);
  }

  Future<Map<String, String>> _headers({bool auth = false}) async {
    final headers = <String, String>{
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    if (auth) {
      final token = Supabase.instance.client.auth.currentSession?.accessToken;
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }
    }
    return headers;
  }

  /// dart:io does not re-POST across 301/302/303; apex→www often uses 308 and still
  /// breaks on some clients. Follow redirect targets ourselves for unsafe methods.
  Future<http.Response> _sendWithRedirects(
    String method,
    Uri url, {
    required Map<String, String> headers,
    Object? body,
    int maxRedirects = 5,
  }) async {
    var current = url;
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

      final location = response.headers['location'];
      if (location == null || location.isEmpty) return response;

      final next = current.resolve(location);
      // Prefer www when the host bounces apex → www.
      current = next.host == 'mygarage.ug'
          ? next.replace(host: 'www.mygarage.ug')
          : next;

      // 303: method becomes GET and body dropped (standard).
      if (response.statusCode == 303) {
        return _sendWithRedirects('GET', current, headers: headers, body: null, maxRedirects: maxRedirects - i - 1);
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
