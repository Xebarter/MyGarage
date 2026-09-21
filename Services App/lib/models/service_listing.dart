class ServiceListing {
  ServiceListing({
    required this.id,
    required this.vendorId,
    required this.categoryId,
    required this.serviceName,
    required this.priceUgx,
    this.currency = 'UGX',
    this.status = 'active',
    this.etaMinutes,
    this.description = '',
    this.mobileAvailable = true,
    this.emergency = false,
  });

  final String id;
  final String vendorId;
  final String categoryId;
  final String serviceName;
  final double priceUgx;
  final String currency;
  final String status;
  final int? etaMinutes;
  final String description;
  final bool mobileAvailable;
  final bool emergency;

  bool get isActive => status == 'active';

  factory ServiceListing.fromJson(Map<String, dynamic> json) {
    return ServiceListing(
      id: json['id']?.toString() ?? '',
      vendorId: json['vendorId']?.toString() ?? '',
      categoryId: json['categoryId']?.toString() ?? '',
      serviceName: json['serviceName']?.toString() ?? '',
      priceUgx: (json['priceUgx'] as num?)?.toDouble() ?? 0,
      currency: json['currency']?.toString() ?? 'UGX',
      status: json['status']?.toString() ?? 'active',
      etaMinutes: (json['etaMinutes'] as num?)?.toInt(),
      description: json['description']?.toString() ?? '',
      mobileAvailable: json['mobileAvailable'] == true,
      emergency: json['emergency'] == true,
    );
  }

  Map<String, dynamic> toUpsertJson() {
    return {
      if (id.isNotEmpty) 'id': id,
      'categoryId': categoryId,
      'serviceName': serviceName,
      'priceUgx': priceUgx,
      'status': status,
      'etaMinutes': etaMinutes,
      'description': description,
      'mobileAvailable': mobileAvailable,
      'emergency': emergency,
    };
  }

  ServiceListing copyWith({
    String? categoryId,
    String? serviceName,
    double? priceUgx,
    String? status,
    int? etaMinutes,
    String? description,
    bool? mobileAvailable,
    bool? emergency,
  }) {
    return ServiceListing(
      id: id,
      vendorId: vendorId,
      categoryId: categoryId ?? this.categoryId,
      serviceName: serviceName ?? this.serviceName,
      priceUgx: priceUgx ?? this.priceUgx,
      currency: currency,
      status: status ?? this.status,
      etaMinutes: etaMinutes ?? this.etaMinutes,
      description: description ?? this.description,
      mobileAvailable: mobileAvailable ?? this.mobileAvailable,
      emergency: emergency ?? this.emergency,
    );
  }
}

class ServiceCategoryOption {
  const ServiceCategoryOption({required this.id, required this.title});

  final String id;
  final String title;
}

const kServiceCategories = <ServiceCategoryOption>[
  ServiceCategoryOption(id: 'emergency-help', title: 'Emergency Help'),
  ServiceCategoryOption(id: 'fix-my-car', title: 'Fix My Car'),
  ServiceCategoryOption(id: 'service-my-car', title: 'Service My Car'),
  ServiceCategoryOption(id: 'tyres-battery', title: 'Tyres & Battery'),
  ServiceCategoryOption(id: 'car-wash-cleaning', title: 'Car Wash & Cleaning'),
  ServiceCategoryOption(id: 'body-repair-painting', title: 'Body Repair'),
  ServiceCategoryOption(id: 'ac-cooling', title: 'AC & Cooling'),
  ServiceCategoryOption(id: 'security-tracking', title: 'Security & Tracking'),
  ServiceCategoryOption(id: 'documents-insurance', title: 'Documents & Insurance'),
  ServiceCategoryOption(id: 'drivers-transport', title: 'Drivers & Transport'),
  ServiceCategoryOption(id: 'fuel-delivery', title: 'Fuel Delivery'),
  ServiceCategoryOption(id: 'rent-buy-car', title: 'Rent / Buy Car'),
  ServiceCategoryOption(id: 'upgrade-my-car', title: 'Upgrade My Car'),
];

/// Catalog service names by category (must match web `userServiceCategories`).
const kCatalogServicesByCategory = <String, List<String>>{
  'emergency-help': [
    'Towing (accident / breakdown)',
    'Jump-start (dead battery)',
    'Flat tyre change',
    'Fuel delivery (ran out of fuel)',
    "Car won't start (mobile mechanic)",
    'Keys locked in car',
    'Vehicle stuck (mud, ditch recovery)',
  ],
  'fix-my-car': [
    'Engine problems (noise, overheating, smoke)',
    'Brake problems (not stopping well)',
    'Suspension issues (noise, rough ride)',
    'Electrical issues (lights, battery draining)',
    'AC not cooling',
    'Gearbox / clutch issues',
    'Exhaust problems',
  ],
  'service-my-car': [
    'Oil change',
    'Full service (minor / major)',
    'Brake check',
    'Tyre rotation / alignment',
    'Battery check',
    'General inspection',
  ],
  'tyres-battery': [
    'Buy tyres',
    'Fix puncture',
    'Replace tyres',
    'Wheel alignment',
    'Battery replacement',
    'Battery charging',
  ],
  'car-wash-cleaning': [
    'Basic wash',
    'Interior cleaning',
    'Full detailing',
    'Engine cleaning',
    'Mobile car wash (come to me)',
  ],
  'body-repair-painting': [
    'Dent removal',
    'Scratch repair',
    'Full painting',
    'Bumper repair',
    'Accident repair',
  ],
  'ac-cooling': [
    'AC repair',
    'AC gas refill',
    'Car overheating',
    'Radiator issues',
  ],
  'security-tracking': [
    'Install car tracker',
    'Install alarm',
    'Anti-theft systems',
    'Track my car',
  ],
  'documents-insurance': [
    'Motor insurance',
    'Renew insurance',
    'Transfer ownership',
    'Road license',
    'Driving permit help',
  ],
  'drivers-transport': [
    'Hire driver',
    'Learn driving',
    'Chauffeur services',
  ],
  'fuel-delivery': [
    'Fuel delivery',
    'Oil delivery',
    'Battery delivery',
  ],
  'rent-buy-car': [
    'Rent a car',
    'Hire car with driver',
    'Buy a car',
    'Sell a car',
  ],
  'upgrade-my-car': [
    'Install music system',
    'Tint windows',
    'Car wrapping',
    'Interior upgrades',
    'Lights upgrade',
  ],
};

List<String> catalogServiceNamesFor(String categoryId) {
  return List<String>.from(kCatalogServicesByCategory[categoryId] ?? const <String>[]);
}
