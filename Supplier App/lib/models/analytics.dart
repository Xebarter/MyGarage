class VendorAnalytics {
  VendorAnalytics({
    required this.totalRevenue,
    required this.totalOrders,
    required this.totalProducts,
    required this.averageOrderValue,
    required this.revenueTrend,
    required this.orderTrend,
    required this.topProducts,
    required this.ordersByStatus,
  });

  final double totalRevenue;
  final int totalOrders;
  final int totalProducts;
  final double averageOrderValue;
  final List<TrendPoint> revenueTrend;
  final List<TrendPoint> orderTrend;
  final List<TopProduct> topProducts;
  final OrdersByStatus ordersByStatus;

  factory VendorAnalytics.fromJson(Map<String, dynamic> json) {
    return VendorAnalytics(
      totalRevenue: (json['totalRevenue'] as num?)?.toDouble() ?? 0,
      totalOrders: (json['totalOrders'] as num?)?.toInt() ?? 0,
      totalProducts: (json['totalProducts'] as num?)?.toInt() ?? 0,
      averageOrderValue: (json['averageOrderValue'] as num?)?.toDouble() ?? 0,
      revenueTrend: (json['revenueTrend'] as List<dynamic>? ?? [])
          .whereType<Map>()
          .map((e) => TrendPoint.fromJson(Map<String, dynamic>.from(e), valueKey: 'revenue'))
          .toList(),
      orderTrend: (json['orderTrend'] as List<dynamic>? ?? [])
          .whereType<Map>()
          .map((e) => TrendPoint.fromJson(Map<String, dynamic>.from(e), valueKey: 'orders'))
          .toList(),
      topProducts: (json['topProducts'] as List<dynamic>? ?? [])
          .whereType<Map>()
          .map((e) => TopProduct.fromJson(Map<String, dynamic>.from(e)))
          .toList(),
      ordersByStatus: OrdersByStatus.fromJson(
        json['ordersByStatus'] is Map ? Map<String, dynamic>.from(json['ordersByStatus'] as Map) : {},
      ),
    );
  }
}

class TrendPoint {
  TrendPoint({required this.label, required this.value});

  final String label;
  final double value;

  factory TrendPoint.fromJson(Map<String, dynamic> json, {required String valueKey}) {
    return TrendPoint(
      label: json['label']?.toString() ?? '',
      value: (json[valueKey] as num?)?.toDouble() ?? 0,
    );
  }
}

class TopProduct {
  TopProduct({
    required this.id,
    required this.name,
    required this.category,
    required this.sales,
    required this.price,
  });

  final String id;
  final String name;
  final String category;
  final int sales;
  final double price;

  factory TopProduct.fromJson(Map<String, dynamic> json) {
    return TopProduct(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      category: json['category']?.toString() ?? '',
      sales: (json['sales'] as num?)?.toInt() ?? 0,
      price: (json['price'] as num?)?.toDouble() ?? 0,
    );
  }
}

class OrdersByStatus {
  OrdersByStatus({
    required this.pending,
    required this.processing,
    required this.shipped,
    required this.delivered,
    required this.cancelled,
  });

  final int pending;
  final int processing;
  final int shipped;
  final int delivered;
  final int cancelled;

  factory OrdersByStatus.fromJson(Map<String, dynamic> json) {
    int n(String key) => (json[key] as num?)?.toInt() ?? 0;
    return OrdersByStatus(
      pending: n('pending'),
      processing: n('processing'),
      shipped: n('shipped'),
      delivered: n('delivered'),
      cancelled: n('cancelled'),
    );
  }
}
