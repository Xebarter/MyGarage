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

class ConciergeProductCard {
  ConciergeProductCard({
    required this.id,
    required this.name,
    required this.price,
    required this.image,
    this.compareAtPrice,
    this.category = '',
    this.brand = '',
    this.href = '',
    this.description = '',
  });

  final String id;
  final String name;
  final double price;
  final double? compareAtPrice;
  final String image;
  final String category;
  final String brand;
  final String href;
  final String description;

  factory ConciergeProductCard.fromJson(Map<String, dynamic> json) {
    return ConciergeProductCard(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      price: (json['price'] as num?)?.toDouble() ?? 0,
      compareAtPrice: (json['compareAtPrice'] as num?)?.toDouble(),
      image: json['image']?.toString() ?? '',
      category: json['category']?.toString() ?? '',
      brand: json['brand']?.toString() ?? '',
      href: json['href']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'price': price,
        if (compareAtPrice != null) 'compareAtPrice': compareAtPrice,
        'image': image,
        'category': category,
        'brand': brand,
        'href': href,
        if (description.isNotEmpty) 'description': description,
      };
}

class ConciergeProductBrowse {
  ConciergeProductBrowse({
    required this.title,
    required this.products,
    this.query,
    this.category,
    this.total = 0,
    this.offset = 0,
    this.hasMore = false,
    this.departments = const [],
  });

  final String title;
  final String? query;
  final String? category;
  final int total;
  final int offset;
  final bool hasMore;
  final List<ConciergeProductCard> products;
  final List<ConciergeShopDepartment> departments;

  ConciergeProductBrowse merge(ConciergeProductBrowse next) {
    final seen = products.map((e) => e.id).toSet();
    return ConciergeProductBrowse(
      title: next.title.isNotEmpty ? next.title : title,
      query: next.query ?? query,
      category: next.category ?? category,
      total: next.total,
      offset: offset,
      hasMore: next.hasMore,
      departments: next.departments.isNotEmpty ? next.departments : departments,
      products: [
        ...products,
        ...next.products.where((e) => seen.add(e.id)),
      ],
    );
  }

  factory ConciergeProductBrowse.fromJson(Map<String, dynamic> json) {
    final list = json['products'] is List ? json['products'] as List : const [];
    final depts = json['departments'] is List ? json['departments'] as List : const [];
    return ConciergeProductBrowse(
      title: json['title']?.toString() ?? 'Shop',
      query: json['query']?.toString(),
      category: json['category']?.toString(),
      total: (json['total'] as num?)?.toInt() ?? 0,
      offset: (json['offset'] as num?)?.toInt() ?? 0,
      hasMore: json['hasMore'] == true,
      departments: depts.whereType<Map>().map((e) => ConciergeShopDepartment.fromJson(Map<String, dynamic>.from(e))).toList(),
      products: list
          .whereType<Map>()
          .map((e) => ConciergeProductCard.fromJson(Map<String, dynamic>.from(e)))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() => {
        'title': title,
        if (query != null) 'query': query,
        if (category != null) 'category': category,
        'total': total,
        'offset': offset,
        'hasMore': hasMore,
        'products': products.map((e) => e.toJson()).toList(),
        if (departments.isNotEmpty) 'departments': departments.map((e) => e.toJson()).toList(),
      };
}

class ConciergeShopDepartment {
  ConciergeShopDepartment({required this.title, this.children = const []});

  final String title;
  final List<String> children;

  factory ConciergeShopDepartment.fromJson(Map<String, dynamic> json) {
    final kids = json['children'] is List ? json['children'] as List : const [];
    return ConciergeShopDepartment(
      title: json['title']?.toString() ?? '',
      children: kids.map((e) => e.toString()).where((e) => e.isNotEmpty).toList(),
    );
  }

  Map<String, dynamic> toJson() => {
        'title': title,
        'children': children,
      };
}

class ConciergeOrderCard {
  ConciergeOrderCard({
    required this.id,
    required this.status,
    required this.total,
    this.itemSummary = '',
    this.href = '',
    this.hrefMobile = '',
  });

  final String id;
  final String status;
  final double total;
  final String itemSummary;
  final String href;
  final String hrefMobile;

  factory ConciergeOrderCard.fromJson(Map<String, dynamic> json) {
    return ConciergeOrderCard(
      id: json['id']?.toString() ?? '',
      status: json['status']?.toString() ?? '',
      total: (json['total'] as num?)?.toDouble() ?? 0,
      itemSummary: json['itemSummary']?.toString() ?? '',
      href: json['href']?.toString() ?? '',
      hrefMobile: json['hrefMobile']?.toString() ?? '',
    );
  }
}

class ConciergeBookingCard {
  ConciergeBookingCard({
    required this.id,
    required this.status,
    this.service = '',
    this.location = '',
    this.href = '',
    this.hrefMobile = '',
  });

  final String id;
  final String status;
  final String service;
  final String location;
  final String href;
  final String hrefMobile;

  factory ConciergeBookingCard.fromJson(Map<String, dynamic> json) {
    return ConciergeBookingCard(
      id: json['id']?.toString() ?? '',
      status: json['status']?.toString() ?? '',
      service: json['service']?.toString() ?? '',
      location: json['location']?.toString() ?? '',
      href: json['href']?.toString() ?? '',
      hrefMobile: json['hrefMobile']?.toString() ?? '',
    );
  }
}

class ConciergeShopHome {
  ConciergeShopHome({required this.departments, this.browse});

  final List<ConciergeShopDepartment> departments;
  final ConciergeProductBrowse? browse;

  factory ConciergeShopHome.fromJson(Map<String, dynamic> json) {
    final depts = json['departments'] is List ? json['departments'] as List : const [];
    final browse = json['browse'];
    return ConciergeShopHome(
      departments: depts
          .whereType<Map>()
          .map((e) => ConciergeShopDepartment.fromJson(Map<String, dynamic>.from(e)))
          .toList(),
      browse: browse is Map ? ConciergeProductBrowse.fromJson(Map<String, dynamic>.from(browse)) : null,
    );
  }
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
    this.title = '',
    this.description = '',
    this.href = '',
    this.hrefMobile = '',
    this.summary = '',
    this.label = '',
    this.fullAddress = '',
    this.next = '',
    this.make = '',
    this.model = '',
    this.year = 0,
    this.licensePlate = '',
    this.nickname = '',
    this.color = '',
    this.imageUrl = '',
    this.payload = const {},
  });

  final String type;
  final List<ConciergeQuoteLine> lines;
  final String categoryId;
  final String category;
  final String service;
  final String? vehicleId;
  final String notes;
  final String location;
  final String title;
  final String description;
  final String href;
  final String hrefMobile;
  final String summary;
  final String label;
  final String fullAddress;
  final String next;
  final String make;
  final String model;
  final int year;
  final String licensePlate;
  final String nickname;
  final String color;
  final String imageUrl;
  final Map<String, dynamic> payload;

  bool get isQuote => type == 'quote';
  bool get isBook => type == 'book';
  bool get isGuide => !isQuote && !isBook;

  factory ConciergePendingAction.fromJson(Map<String, dynamic> json) {
    final lines = json['lines'] is List ? json['lines'] as List : const [];
    final updates = json['updates'] is Map ? Map<String, dynamic>.from(json['updates'] as Map) : const <String, dynamic>{};
    return ConciergePendingAction(
      type: json['type']?.toString() ?? '',
      lines: lines.whereType<Map>().map((e) => ConciergeQuoteLine.fromJson(Map<String, dynamic>.from(e))).toList(),
      categoryId: json['categoryId']?.toString() ?? '',
      category: json['category']?.toString() ?? '',
      service: json['service']?.toString() ?? '',
      vehicleId: json['vehicleId']?.toString(),
      notes: json['notes']?.toString() ?? '',
      location: json['location']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      description: json['description']?.toString() ?? json['summary']?.toString() ?? '',
      href: json['href']?.toString() ?? '',
      hrefMobile: json['hrefMobile']?.toString() ?? json['href']?.toString() ?? '',
      summary: json['summary']?.toString() ?? '',
      label: json['label']?.toString() ?? '',
      fullAddress: json['fullAddress']?.toString() ?? '',
      next: json['next']?.toString() ?? '',
      make: json['make']?.toString() ?? updates['make']?.toString() ?? '',
      model: json['model']?.toString() ?? updates['model']?.toString() ?? '',
      year: (json['year'] as num?)?.toInt() ?? (updates['year'] as num?)?.toInt() ?? 0,
      licensePlate: json['licensePlate']?.toString() ?? updates['licensePlate']?.toString() ?? '',
      nickname: json['nickname']?.toString() ?? updates['nickname']?.toString() ?? '',
      color: json['color']?.toString() ?? updates['color']?.toString() ?? '',
      imageUrl: json['imageUrl']?.toString() ?? updates['imageUrl']?.toString() ?? '',
      payload: json,
    );
  }

  Map<String, dynamic> toJson() => payload.isNotEmpty
      ? payload
      : {
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
    this.productBrowse,
    this.productDetail,
    this.shopCategories = const [],
    this.orderBrowse = const [],
    this.bookingBrowse = const [],
    this.configured = true,
  });

  final String reply;
  final ConciergePendingAction? pendingAction;
  final ConciergeProductBrowse? productBrowse;
  final ConciergeProductCard? productDetail;
  final List<ConciergeShopDepartment> shopCategories;
  final List<ConciergeOrderCard> orderBrowse;
  final List<ConciergeBookingCard> bookingBrowse;
  final bool configured;

  factory ConciergeChatResult.fromJson(Map<String, dynamic> json) {
    final pending = json['pendingAction'];
    final browse = json['productBrowse'];
    final detail = json['productDetail'];
    final departments = json['shopCategories'];
    final orders = json['orderBrowse'];
    final bookings = json['bookingBrowse'];
    return ConciergeChatResult(
      reply: json['reply']?.toString() ?? json['error']?.toString() ?? '',
      pendingAction: pending is Map ? ConciergePendingAction.fromJson(Map<String, dynamic>.from(pending)) : null,
      productBrowse: browse is Map ? ConciergeProductBrowse.fromJson(Map<String, dynamic>.from(browse)) : null,
      productDetail: detail is Map ? ConciergeProductCard.fromJson(Map<String, dynamic>.from(detail)) : null,
      shopCategories: departments is List
          ? departments
              .whereType<Map>()
              .map((e) => ConciergeShopDepartment.fromJson(Map<String, dynamic>.from(e)))
              .toList()
          : const [],
      orderBrowse: orders is List
          ? orders.whereType<Map>().map((e) => ConciergeOrderCard.fromJson(Map<String, dynamic>.from(e))).toList()
          : const [],
      bookingBrowse: bookings is List
          ? bookings.whereType<Map>().map((e) => ConciergeBookingCard.fromJson(Map<String, dynamic>.from(e))).toList()
          : const [],
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
    this.code,
    this.href,
    this.hrefMobile,
    this.message,
  });

  final bool ok;
  final String? type;
  final List<ConciergeQuoteLine> lines;
  final String? requestId;
  final String? trackPath;
  final String? error;
  final String? field;
  final String? code;
  final String? href;
  final String? hrefMobile;
  final String? message;

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
      code: json['code']?.toString(),
      field: json['field']?.toString() ??
          (json['code']?.toString() == 'SIGN_IN_REQUIRED'
              ? 'sign_in'
              : json['code']?.toString() == 'LOCATION_REQUIRED'
                  ? 'location'
                  : json['code']?.toString() == 'PHONE_REQUIRED'
                      ? 'phone'
                      : null),
      href: json['href']?.toString(),
      hrefMobile: json['hrefMobile']?.toString(),
      message: json['message']?.toString(),
    );
  }
}
