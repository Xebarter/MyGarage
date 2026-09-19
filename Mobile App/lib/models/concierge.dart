class ConciergeQuoteLine {
  ConciergeQuoteLine({
    required this.productId,
    required this.name,
    required this.price,
    required this.image,
    this.quantity = 1,
    this.vendorId,
  });

  final String productId;
  final String name;
  final double price;
  final String image;
  final int quantity;
  final String? vendorId;

  factory ConciergeQuoteLine.fromJson(Map<String, dynamic> json) {
    return ConciergeQuoteLine(
      productId: json['productId']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      price: (json['price'] as num?)?.toDouble() ?? 0,
      image: json['image']?.toString() ?? '',
      quantity: (json['quantity'] as num?)?.toInt() ?? 1,
      vendorId: json['vendorId']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'productId': productId,
        'name': name,
        'price': price,
        'image': image,
        'quantity': quantity,
        if (vendorId != null) 'vendorId': vendorId,
      };
}

class ConciergePendingAction {
  ConciergePendingAction({
    required this.type,
    this.lines = const [],
    this.categoryId = '',
    this.category = '',
    this.service = '',
    this.vehicleId,
    this.notes = '',
    this.location = '',
  });

  final String type;
  final List<ConciergeQuoteLine> lines;
  final String categoryId;
  final String category;
  final String service;
  final String? vehicleId;
  final String notes;
  final String location;

  bool get isQuote => type == 'quote';
  bool get isBook => type == 'book';

  factory ConciergePendingAction.fromJson(Map<String, dynamic> json) {
    final lines = json['lines'] is List ? json['lines'] as List : const [];
    return ConciergePendingAction(
      type: json['type']?.toString() ?? '',
      lines: lines
          .whereType<Map>()
          .map((e) => ConciergeQuoteLine.fromJson(Map<String, dynamic>.from(e)))
          .toList(),
      categoryId: json['categoryId']?.toString() ?? '',
      category: json['category']?.toString() ?? '',
      service: json['service']?.toString() ?? '',
      vehicleId: json['vehicleId']?.toString(),
      notes: json['notes']?.toString() ?? '',
      location: json['location']?.toString() ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'type': type,
        if (isQuote) 'lines': lines.map((e) => e.toJson()).toList(),
        if (isBook) ...{
          'categoryId': categoryId,
          'category': category,
          'service': service,
          'vehicleId': vehicleId,
          'notes': notes,
          'location': location,
        },
      };
}

class ConciergeChatResult {
  ConciergeChatResult({
    required this.reply,
    this.pendingAction,
    this.configured = true,
  });

  final String reply;
  final ConciergePendingAction? pendingAction;
  final bool configured;

  factory ConciergeChatResult.fromJson(Map<String, dynamic> json) {
    final pending = json['pendingAction'];
    return ConciergeChatResult(
      reply: json['reply']?.toString() ?? json['error']?.toString() ?? '',
      pendingAction: pending is Map ? ConciergePendingAction.fromJson(Map<String, dynamic>.from(pending)) : null,
      configured: json['configured'] != false &&
          json['code']?.toString() != 'GROK_UNAVAILABLE' &&
          json['code']?.toString() != 'GEMINI_UNAVAILABLE',
    );
  }
}

class ConciergeActResult {
  ConciergeActResult({
    required this.ok,
    this.type,
    this.lines = const [],
    this.requestId,
    this.trackPath,
    this.error,
    this.field,
  });

  final bool ok;
  final String? type;
  final List<ConciergeQuoteLine> lines;
  final String? requestId;
  final String? trackPath;
  final String? error;
  final String? field;

  factory ConciergeActResult.fromJson(Map<String, dynamic> json) {
    final lines = json['lines'] is List ? json['lines'] as List : const [];
    return ConciergeActResult(
      ok: json['ok'] == true,
      type: json['type']?.toString(),
      lines: lines
          .whereType<Map>()
          .map((e) => ConciergeQuoteLine.fromJson(Map<String, dynamic>.from(e)))
          .toList(),
      requestId: json['requestId']?.toString(),
      trackPath: json['trackPath']?.toString(),
      error: json['error']?.toString(),
      field: json['field']?.toString() ??
          (json['code']?.toString() == 'SIGN_IN_REQUIRED'
              ? 'sign_in'
              : json['code']?.toString() == 'LOCATION_REQUIRED'
                  ? 'location'
                  : json['code']?.toString() == 'PHONE_REQUIRED'
                      ? 'phone'
                      : null),
    );
  }
}
