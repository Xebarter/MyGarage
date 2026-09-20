class VendorOrderItem {
  VendorOrderItem({
    required this.id,
    required this.productName,
    required this.quantity,
    required this.price,
    required this.vendorId,
    this.productId = '',
  });

  final String id;
  final String productName;
  final int quantity;
  final double price;
  final String vendorId;
  final String productId;

  factory VendorOrderItem.fromJson(Map<String, dynamic> json) {
    return VendorOrderItem(
      id: json['id']?.toString() ?? '',
      productName: (json['productName'] ?? json['product_name'] ?? json['name'])?.toString() ?? 'Item',
      quantity: (json['quantity'] as num?)?.toInt() ?? 0,
      price: (json['price'] as num?)?.toDouble() ??
          (json['unitAmount'] as num?)?.toDouble() ??
          0,
      vendorId: json['vendorId']?.toString() ?? '',
      productId: json['productId']?.toString() ?? '',
    );
  }
}

class VendorOrder {
  VendorOrder({
    required this.id,
    required this.status,
    required this.items,
    required this.subtotal,
    required this.total,
    required this.customerName,
    required this.customerEmail,
    required this.shippingAddress,
    this.customerId = '',
    this.trackingNumber,
    this.carrier,
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String status;
  final List<VendorOrderItem> items;
  final double subtotal;
  final double total;
  final String customerName;
  final String customerEmail;
  final String shippingAddress;
  final String customerId;
  final String? trackingNumber;
  final String? carrier;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  factory VendorOrder.fromJson(Map<String, dynamic> json) {
    final itemsRaw = json['items'];
    return VendorOrder(
      id: json['id']?.toString() ?? '',
      status: json['status']?.toString() ?? 'pending_fulfillment',
      items: itemsRaw is List
          ? itemsRaw
              .whereType<Map>()
              .map((e) => VendorOrderItem.fromJson(Map<String, dynamic>.from(e)))
              .toList()
          : const [],
      subtotal: (json['subtotal'] as num?)?.toDouble() ?? 0,
      total: (json['total'] as num?)?.toDouble() ?? 0,
      customerName: json['customerName']?.toString() ?? '',
      customerEmail: json['customerEmail']?.toString() ?? '',
      shippingAddress: json['shippingAddress']?.toString() ?? '',
      customerId: json['customerId']?.toString() ?? '',
      trackingNumber: json['trackingNumber']?.toString(),
      carrier: json['carrier']?.toString(),
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt'].toString()) : null,
      updatedAt: json['updatedAt'] != null ? DateTime.tryParse(json['updatedAt'].toString()) : null,
    );
  }

  List<VendorOrderItem> vendorItems(String vendorId) =>
      items.where((item) => item.vendorId == vendorId || vendorId.isEmpty).toList();

  double vendorSubtotal(String vendorId) =>
      vendorItems(vendorId).fold(0, (sum, item) => sum + item.price * item.quantity);

  bool hasOtherVendors(String vendorId) =>
      items.any((item) => item.vendorId.isNotEmpty && item.vendorId != vendorId);

  String get normalizedStatus {
    final raw = status.trim().toLowerCase();
    if (raw == 'pending') return 'pending_fulfillment';
    if (raw == 'in transit' || raw == 'in_transit') return 'shipped';
    return raw;
  }
}

List<String> allowedVendorTransitions(String current) {
  switch (current) {
    case 'pending':
    case 'pending_fulfillment':
      return ['processing', 'cancelled'];
    case 'processing':
      return ['shipped', 'cancelled'];
    case 'shipped':
      return ['delivered'];
    default:
      return [];
  }
}
