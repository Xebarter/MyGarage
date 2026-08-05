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

  Future<T> get<T>(
    String path, {
    Map<String, String>? query,
    bool auth = false,
    T Function(dynamic json)? parser,
  }) async {
    final res = await _client.get(_uri(path, query), headers: await _headers(auth: auth));
    return _decode(res, parser: parser);
  }

  Future<T> post<T>(
    String path, {
    Object? body,
    bool auth = false,
    T Function(dynamic json)? parser,
  }) async {
    final res = await _client.post(
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
    final res = await _client.put(
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
    final res = await _client.patch(
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
    final res = await _client.delete(_uri(path, query), headers: await _headers(auth: auth));
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
