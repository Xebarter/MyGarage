import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/concierge.dart';

const conciergeThreadKey = 'mygarage_concierge_chat_v1';

class ConciergeChatLine {
  ConciergeChatLine({
    required this.role,
    required this.text,
    this.actDone = false,
    this.browse,
    this.detail,
    this.departments = const [],
    this.orders = const [],
    this.bookings = const [],
    this.imageUrl,
  });

  final String role;
  final String text;
  final bool actDone;
  ConciergeProductBrowse? browse;
  final ConciergeProductCard? detail;
  final List<ConciergeShopDepartment> departments;
  final List<ConciergeOrderCard> orders;
  final List<ConciergeBookingCard> bookings;
  final String? imageUrl;

  factory ConciergeChatLine.fromJson(Map<String, dynamic> json) {
    final browse = json['browse'];
    final detail = json['detail'];
    final depts = json['departments'];
    final orders = json['orders'];
    final bookings = json['bookings'];
    return ConciergeChatLine(
      role: json['role']?.toString() ?? 'assistant',
      text: json['text']?.toString() ?? '',
      actDone: json['actDone'] == true,
      browse: browse is Map ? ConciergeProductBrowse.fromJson(Map<String, dynamic>.from(browse)) : null,
      detail: detail is Map ? ConciergeProductCard.fromJson(Map<String, dynamic>.from(detail)) : null,
      departments: depts is List
          ? depts
              .whereType<Map>()
              .map((e) => ConciergeShopDepartment.fromJson(Map<String, dynamic>.from(e)))
              .toList()
          : const [],
      orders: orders is List
          ? orders.whereType<Map>().map((e) => ConciergeOrderCard.fromJson(Map<String, dynamic>.from(e))).toList()
          : const [],
      bookings: bookings is List
          ? bookings.whereType<Map>().map((e) => ConciergeBookingCard.fromJson(Map<String, dynamic>.from(e))).toList()
          : const [],
      imageUrl: json['imageUrl']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'role': role,
        'text': text,
        'actDone': actDone,
        if (browse != null) 'browse': browse!.toJson(),
        if (detail != null) 'detail': detail!.toJson(),
        if (departments.isNotEmpty) 'departments': departments.map((e) => e.toJson()).toList(),
        if (orders.isNotEmpty)
          'orders': orders
              .map((e) => {
                    'id': e.id,
                    'status': e.status,
                    'total': e.total,
                    'itemSummary': e.itemSummary,
                    'href': e.href,
                    'hrefMobile': e.hrefMobile,
                  })
              .toList(),
        if (bookings.isNotEmpty)
          'bookings': bookings
              .map((e) => {
                    'id': e.id,
                    'status': e.status,
                    'service': e.service,
                    'location': e.location,
                    'href': e.href,
                    'hrefMobile': e.hrefMobile,
                  })
              .toList(),
        if (imageUrl != null && imageUrl!.isNotEmpty) 'imageUrl': imageUrl,
      };
}

class ConciergeThread {
  ConciergeThread({
    this.messages = const [],
    this.pendingAction,
    this.vehicleId,
  });

  final List<ConciergeChatLine> messages;
  final ConciergePendingAction? pendingAction;
  final String? vehicleId;

  factory ConciergeThread.fromJson(Map<String, dynamic> json) {
    final messages = json['messages'];
    final pending = json['pendingAction'];
    return ConciergeThread(
      messages: messages is List
          ? messages
              .whereType<Map>()
              .map((e) => ConciergeChatLine.fromJson(Map<String, dynamic>.from(e)))
              .toList()
          : const [],
      pendingAction:
          pending is Map ? ConciergePendingAction.fromJson(Map<String, dynamic>.from(pending)) : null,
      vehicleId: json['vehicleId']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'messages': messages.map((e) => e.toJson()).toList(),
        if (pendingAction != null) 'pendingAction': pendingAction!.toJson(),
        if (vehicleId != null && vehicleId!.isNotEmpty) 'vehicleId': vehicleId,
      };
}

class ConciergeThreadStore {
  static Future<ConciergeThread> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(conciergeThreadKey);
    if (raw == null || raw.isEmpty) return ConciergeThread();
    try {
      final json = jsonDecode(raw);
      if (json is! Map) return ConciergeThread();
      return ConciergeThread.fromJson(Map<String, dynamic>.from(json));
    } catch (_) {
      return ConciergeThread();
    }
  }

  static Future<void> save(ConciergeThread thread) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(conciergeThreadKey, jsonEncode(thread.toJson()));
  }

  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(conciergeThreadKey);
  }
}
