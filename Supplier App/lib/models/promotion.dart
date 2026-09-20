class Promotion {
  Promotion({
    required this.id,
    required this.code,
    required this.description,
    this.discountType = 'percentage',
    this.discountValue = 0,
    this.validFrom,
    this.validUntil,
    this.active = true,
  });

  final String id;
  final String code;
  final String description;
  final String discountType;
  final double discountValue;
  final DateTime? validFrom;
  final DateTime? validUntil;
  final bool active;

  factory Promotion.fromJson(Map<String, dynamic> json) {
    return Promotion(
      id: json['id']?.toString() ?? '',
      code: json['code']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      discountType: json['discountType']?.toString() ?? 'percentage',
      discountValue: (json['discountValue'] as num?)?.toDouble() ?? 0,
      validFrom: json['validFrom'] != null ? DateTime.tryParse(json['validFrom'].toString()) : null,
      validUntil: json['validUntil'] != null ? DateTime.tryParse(json['validUntil'].toString()) : null,
      active: json['active'] != false,
    );
  }
}

class AdApplication {
  AdApplication({
    required this.id,
    required this.vendorId,
    required this.scope,
    required this.status,
    this.productId,
    this.productName,
    this.message,
    this.createdAt,
  });

  final String id;
  final String vendorId;
  final String scope;
  final String status;
  final String? productId;
  final String? productName;
  final String? message;
  final DateTime? createdAt;

  factory AdApplication.fromJson(Map<String, dynamic> json) {
    return AdApplication(
      id: json['id']?.toString() ?? '',
      vendorId: json['vendorId']?.toString() ?? '',
      scope: json['scope']?.toString() ?? 'all',
      status: json['status']?.toString() ?? 'pending',
      productId: json['productId']?.toString(),
      productName: json['productName']?.toString(),
      message: json['message']?.toString(),
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt'].toString()) : null,
    );
  }
}
