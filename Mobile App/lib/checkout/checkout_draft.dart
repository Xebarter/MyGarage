import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

const _key = 'mygarage_checkout_draft_v1';

class CheckoutDraft {
  const CheckoutDraft({
    this.name = '',
    this.phone = '',
    this.address = '',
  });

  final String name;
  final String phone;
  final String address;

  bool get isEmpty => name.isEmpty && phone.isEmpty && address.isEmpty;

  Map<String, String> toJson() => {
        'name': name,
        'phone': phone,
        'address': address,
      };

  static CheckoutDraft fromJson(Map<String, dynamic> json) {
    return CheckoutDraft(
      name: (json['name'] as String?)?.trim() ?? '',
      phone: (json['phone'] as String?)?.trim() ?? '',
      address: (json['address'] as String?)?.trim() ?? '',
    );
  }

  static Future<CheckoutDraft?> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw == null || raw.isEmpty) return null;
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map) return null;
      final draft = fromJson(Map<String, dynamic>.from(decoded));
      return draft.isEmpty ? null : draft;
    } catch (_) {
      return null;
    }
  }

  static Future<void> save({
    required String name,
    required String phone,
    required String address,
  }) async {
    final draft = CheckoutDraft(name: name.trim(), phone: phone.trim(), address: address.trim());
    final prefs = await SharedPreferences.getInstance();
    if (draft.isEmpty) {
      await prefs.remove(_key);
      return;
    }
    await prefs.setString(_key, jsonEncode(draft.toJson()));
  }

  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_key);
  }
}
