import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Local copy of the last good auth session so a token-refresh blip cannot
/// drop the provider on the sign-in screen.
class SessionBackup {
  SessionBackup._();

  static const staySignedInKey = 'services_stay_signed_in';
  static const vendorJsonKey = 'services_vendor_json';
  static const sessionJsonKey = 'services_session_json';
  static const userIdKey = 'services_user_id';

  static Future<void> captureFromSupabaseIfPresent() async {
    try {
      final session = Supabase.instance.client.auth.currentSession;
      if (session == null) return;
      await persistSession(session);
    } catch (_) {}
  }

  static Future<void> persistSession(Session session) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(staySignedInKey, true);
    await prefs.setString(sessionJsonKey, jsonEncode(session.toJson()));
    final id = session.user.id;
    if (id.isNotEmpty) {
      await prefs.setString(userIdKey, id);
    }
  }

  static Future<void> persistVendorJson(String json) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(staySignedInKey, true);
    await prefs.setString(vendorJsonKey, json);
  }

  static Future<void> persistUserId(String id) async {
    if (id.isEmpty) return;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(staySignedInKey, true);
    await prefs.setString(userIdKey, id);
  }

  static Future<bool> staySignedIn() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getBool(staySignedInKey) == true;
    } catch (_) {
      return false;
    }
  }

  static Future<String?> readSessionJson() async {
    final prefs = await SharedPreferences.getInstance();
    if (prefs.getBool(staySignedInKey) != true) return null;
    return prefs.getString(sessionJsonKey);
  }

  static Future<String?> readVendorJson() async {
    final prefs = await SharedPreferences.getInstance();
    if (prefs.getBool(staySignedInKey) != true) return null;
    return prefs.getString(vendorJsonKey);
  }

  static Future<String?> readUserId() async {
    final prefs = await SharedPreferences.getInstance();
    if (prefs.getBool(staySignedInKey) != true) return null;
    return prefs.getString(userIdKey);
  }

  static Future<String?> readAccessToken() async {
    final raw = await readSessionJson();
    if (raw == null || raw.isEmpty) return null;
    try {
      final map = jsonDecode(raw);
      if (map is! Map) return null;
      final token = map['access_token']?.toString();
      if (token == null || token.isEmpty) return null;
      return token;
    } catch (_) {
      return null;
    }
  }

  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(staySignedInKey);
    await prefs.remove(vendorJsonKey);
    await prefs.remove(sessionJsonKey);
    await prefs.remove(userIdKey);
  }
}
