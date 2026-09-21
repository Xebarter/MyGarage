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

/// Buyer-facing category bundle (same mental model as the buyer Services catalog).
class ServiceCategoryOption {
  const ServiceCategoryOption({
    required this.id,
    required this.emoji,
    required this.title,
    required this.useWhen,
    required this.priority,
  });

  final String id;
  final String emoji;
  final String title;
  final String useWhen;
  /// `urgent` | `common` | `optional` — mirrors buyer Mobile App.
  final String priority;

  bool get isUrgent => priority == 'urgent';
}

/// Same 13 bundles buyers browse — keep ids/names aligned with web `userServiceCategories`.
const kServiceCategories = <ServiceCategoryOption>[
  ServiceCategoryOption(
    id: 'emergency-help',
    emoji: '🚨',
    title: 'Emergency Help',
    useWhen: "When the car won't move / urgent",
    priority: 'urgent',
  ),
  ServiceCategoryOption(
    id: 'fix-my-car',
    emoji: '🔧',
    title: 'Fix My Car',
    useWhen: 'Something is wrong but not urgent',
    priority: 'common',
  ),
  ServiceCategoryOption(
    id: 'service-my-car',
    emoji: '🛠',
    title: 'Service My Car',
    useWhen: 'Routine maintenance',
    priority: 'common',
  ),
  ServiceCategoryOption(
    id: 'tyres-battery',
    emoji: '🚗',
    title: 'Tyres & Battery',
    useWhen: 'High-frequency, simple jobs',
    priority: 'common',
  ),
  ServiceCategoryOption(
    id: 'car-wash-cleaning',
    emoji: '🧼',
    title: 'Car Wash & Cleaning',
    useWhen: 'Wash, detail, interior',
    priority: 'common',
  ),
  ServiceCategoryOption(
    id: 'body-repair-painting',
    emoji: '🎨',
    title: 'Body Repair & Painting',
    useWhen: 'Physical damage',
    priority: 'optional',
  ),
  ServiceCategoryOption(
    id: 'ac-cooling',
    emoji: '❄️',
    title: 'Air Conditioning & Cooling',
    useWhen: 'AC, radiator, overheating',
    priority: 'common',
  ),
  ServiceCategoryOption(
    id: 'security-tracking',
    emoji: '🔐',
    title: 'Security & Tracking',
    useWhen: 'Trackers, alarms, anti-theft',
    priority: 'optional',
  ),
  ServiceCategoryOption(
    id: 'documents-insurance',
    emoji: '📄',
    title: 'Documents & Insurance',
    useWhen: 'Paperwork and renewals',
    priority: 'optional',
  ),
  ServiceCategoryOption(
    id: 'drivers-transport',
    emoji: '🚘',
    title: 'Drivers & Transport',
    useWhen: 'Hire driver, chauffeur, lessons',
    priority: 'optional',
  ),
  ServiceCategoryOption(
    id: 'fuel-delivery',
    emoji: '⛽',
    title: 'Fuel & Delivery',
    useWhen: 'Fuel, oil, battery delivery',
    priority: 'common',
  ),
  ServiceCategoryOption(
    id: 'rent-buy-car',
    emoji: '🚙',
    title: 'Rent or Buy a Car',
    useWhen: 'Rentals and marketplace',
    priority: 'optional',
  ),
  ServiceCategoryOption(
    id: 'upgrade-my-car',
    emoji: '⭐',
    title: 'Upgrade My Car',
    useWhen: 'Audio, tint, wrap, lights',
    priority: 'optional',
  ),
];

ServiceCategoryOption? categoryOptionById(String id) {
  for (final c in kServiceCategories) {
    if (c.id == id) return c;
  }
  return null;
}

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

/// Group vendor listings into buyer-style category bundles (catalog order).
List<({ServiceCategoryOption category, List<ServiceListing> listings})> groupListingsByCategory(
  List<ServiceListing> listings,
) {
  final byId = <String, List<ServiceListing>>{};
  for (final l in listings) {
    byId.putIfAbsent(l.categoryId, () => []).add(l);
  }
  for (final list in byId.values) {
    list.sort((a, b) => a.serviceName.toLowerCase().compareTo(b.serviceName.toLowerCase()));
  }

  final out = <({ServiceCategoryOption category, List<ServiceListing> listings})>[];
  for (final cat in kServiceCategories) {
    final group = byId.remove(cat.id);
    if (group == null || group.isEmpty) continue;
    out.add((category: cat, listings: group));
  }
  for (final entry in byId.entries) {
    if (entry.value.isEmpty) continue;
    out.add((
      category: ServiceCategoryOption(
        id: entry.key,
        emoji: '📋',
        title: entry.key.replaceAll('-', ' '),
        useWhen: 'Your offerings',
        priority: 'optional',
      ),
      listings: entry.value,
    ));
  }
  return out;
}
