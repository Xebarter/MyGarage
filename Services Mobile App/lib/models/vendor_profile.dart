class VendorProfile {
  VendorProfile({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
    required this.address,
    required this.rating,
    required this.totalProducts,
    required this.vendorVerified,
    required this.servicesVerified,
    required this.serviceOfferings,
  });

  final String id;
  final String name;
  final String email;
  final String phone;
  final String address;
  final double rating;
  final int totalProducts;
  final bool vendorVerified;
  final bool servicesVerified;
  final List<String> serviceOfferings;

  factory VendorProfile.fromJson(Map<String, dynamic> json) {
    return VendorProfile(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      phone: json['phone']?.toString() ?? '',
      address: json['address']?.toString() ?? '',
      rating: (json['rating'] as num?)?.toDouble() ?? 0,
      totalProducts: (json['totalProducts'] as num?)?.toInt() ?? 0,
      vendorVerified: json['vendorVerified'] == true,
      servicesVerified: json['servicesVerified'] == true,
      serviceOfferings: (json['serviceOfferings'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
    );
  }

  VendorProfile copyWith({
    String? name,
    String? phone,
    String? address,
  }) {
    return VendorProfile(
      id: id,
      name: name ?? this.name,
      email: email,
      phone: phone ?? this.phone,
      address: address ?? this.address,
      rating: rating,
      totalProducts: totalProducts,
      vendorVerified: vendorVerified,
      servicesVerified: servicesVerified,
      serviceOfferings: serviceOfferings,
    );
  }
}
