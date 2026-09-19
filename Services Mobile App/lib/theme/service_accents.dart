import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// Light premium accent pair for tiles / chips.
class AccentPair {
  const AccentPair({
    required this.accent,
    required this.fill,
    required this.border,
    required this.iconBg,
  });

  final Color accent;
  final Color fill;
  final Color border;
  final Color iconBg;
}

/// Per-category accents — richer chroma, still refined against cream.
const Map<String, AccentPair> kServiceCategoryAccents = {
  'emergency-help': AccentPair(
    accent: Color(0xFFB04A44),
    fill: Color(0xFFF8ECEA),
    border: Color(0xFFE8C9C5),
    iconBg: Color(0xFFF0D8D5),
  ),
  'fix-my-car': AccentPair(
    accent: Color(0xFFC47A2C),
    fill: Color(0xFFF8E9C8),
    border: Color(0xFFE8C56B),
    iconBg: Color(0xFFF3E7C8),
  ),
  'service-my-car': AccentPair(
    accent: Color(0xFF0E9A6A),
    fill: Color(0xFFD3F6E6),
    border: Color(0xFFA8DCC4),
    iconBg: Color(0xFFC4EED8),
  ),
  'tyres-battery': AccentPair(
    accent: Color(0xFFD4A017),
    fill: Color(0xFFF8EFC8),
    border: Color(0xFFE8C56B),
    iconBg: Color(0xFFF3E7C8),
  ),
  'car-wash-cleaning': AccentPair(
    accent: Color(0xFF1A9A8A),
    fill: Color(0xFFD8F3E6),
    border: Color(0xFFA8DCC8),
    iconBg: Color(0xFFC4EED8),
  ),
  'body-repair-painting': AccentPair(
    accent: Color(0xFF6E6458),
    fill: Color(0xFFF3EFE8),
    border: Color(0xFFD8D0C4),
    iconBg: Color(0xFFE6DFD4),
  ),
  'ac-cooling': AccentPair(
    accent: Color(0xFF0E9A8A),
    fill: Color(0xFFD8F3E6),
    border: Color(0xFFA8DCC8),
    iconBg: Color(0xFFC4EED8),
  ),
  'security-tracking': AccentPair(
    accent: Color(0xFF087A53),
    fill: Color(0xFFDFF6EA),
    border: Color(0xFFA8DCC4),
    iconBg: Color(0xFFC4EED8),
  ),
  'documents-insurance': AccentPair(
    accent: Color(0xFF0E9A6A),
    fill: Color(0xFFD3F6E6),
    border: Color(0xFFA8DCC4),
    iconBg: Color(0xFFC4EED8),
  ),
  'drivers-transport': AccentPair(
    accent: Color(0xFF8B6540),
    fill: Color(0xFFF4EDE4),
    border: Color(0xFFDCC8B0),
    iconBg: Color(0xFFE8D6C2),
  ),
  'fuel-delivery': AccentPair(
    accent: Color(0xFFB05A40),
    fill: Color(0xFFF7EBE6),
    border: Color(0xFFE6C8BA),
    iconBg: Color(0xFFEED6CC),
  ),
  'rent-buy-car': AccentPair(
    accent: Color(0xFF12241C),
    fill: Color(0xFFF3E7C8),
    border: Color(0xFFE8C56B),
    iconBg: Color(0xFFF6EDDF),
  ),
  'upgrade-my-car': AccentPair(
    accent: Color(0xFF7A4A62),
    fill: Color(0xFFF4E8EE),
    border: Color(0xFFDCC4D0),
    iconBg: Color(0xFFE8D2DC),
  ),
};

const _fallbackAccents = <AccentPair>[
  AccentPair(
    accent: Color(0xFF0E9A6A),
    fill: Color(0xFFD3F6E6),
    border: Color(0xFFA8DCC4),
    iconBg: Color(0xFFC4EED8),
  ),
  AccentPair(
    accent: Color(0xFFD4A017),
    fill: Color(0xFFF8EFC8),
    border: Color(0xFFE8C56B),
    iconBg: Color(0xFFF3E7C8),
  ),
  AccentPair(
    accent: Color(0xFFC47A2C),
    fill: Color(0xFFF8E9C8),
    border: Color(0xFFE8C56B),
    iconBg: Color(0xFFF3E7C8),
  ),
  AccentPair(
    accent: Color(0xFF1A9A8A),
    fill: Color(0xFFD8F3E6),
    border: Color(0xFFA8DCC8),
    iconBg: Color(0xFFC4EED8),
  ),
  AccentPair(
    accent: Color(0xFF12241C),
    fill: Color(0xFFF3E7C8),
    border: Color(0xFFE8C56B),
    iconBg: Color(0xFFF6EDDF),
  ),
  AccentPair(
    accent: Color(0xFFC45A7A),
    fill: Color(0xFFF8E4EE),
    border: Color(0xFFE8C4D4),
    iconBg: Color(0xFFF0D2DC),
  ),
];

AccentPair accentForCategory(String categoryId, {int seed = 0}) {
  final mapped = kServiceCategoryAccents[categoryId];
  if (mapped != null) return mapped;
  final i = categoryId.hashCode.abs() + seed;
  return _fallbackAccents[i % _fallbackAccents.length];
}

AccentPair accentForSeed(String seed) {
  final i = seed.hashCode.abs();
  return _fallbackAccents[i % _fallbackAccents.length];
}

IconData iconForCategory(String categoryId) {
  switch (categoryId) {
    case 'emergency-help':
      return Icons.emergency_outlined;
    case 'fix-my-car':
      return Icons.build_outlined;
    case 'service-my-car':
      return Icons.handyman_outlined;
    case 'tyres-battery':
      return Icons.tire_repair_outlined;
    case 'car-wash-cleaning':
      return Icons.local_car_wash_outlined;
    case 'body-repair-painting':
      return Icons.format_paint_outlined;
    case 'ac-cooling':
      return Icons.ac_unit_outlined;
    case 'security-tracking':
      return Icons.security_outlined;
    case 'documents-insurance':
      return Icons.description_outlined;
    case 'drivers-transport':
      return Icons.drive_eta_outlined;
    case 'fuel-delivery':
      return Icons.local_gas_station_outlined;
    case 'rent-buy-car':
      return Icons.directions_car_outlined;
    case 'upgrade-my-car':
      return Icons.tune_outlined;
    default:
      return Icons.handyman_outlined;
  }
}

String categoryTitle(String categoryId) {
  for (final c in const [
    ('emergency-help', 'Emergency Help'),
    ('fix-my-car', 'Fix My Car'),
    ('service-my-car', 'Service My Car'),
    ('tyres-battery', 'Tyres & Battery'),
    ('car-wash-cleaning', 'Car Wash'),
    ('body-repair-painting', 'Body Repair'),
    ('ac-cooling', 'AC & Cooling'),
    ('security-tracking', 'Security'),
    ('documents-insurance', 'Documents'),
    ('drivers-transport', 'Drivers'),
    ('fuel-delivery', 'Fuel'),
    ('rent-buy-car', 'Rent / Buy'),
    ('upgrade-my-car', 'Upgrades'),
  ]) {
    if (c.$1 == categoryId) return c.$2;
  }
  return categoryId.replaceAll('-', ' ');
}

Color statusColor(String status) {
  switch (status.toLowerCase()) {
    case 'completed':
      return AppColors.success;
    case 'in_progress':
    case 'matched':
      return AppColors.primary;
    case 'cancelled':
    case 'canceled':
      return AppColors.textMuted;
    case 'pending':
      return AppColors.warning;
    default:
      return AppColors.textSecondary;
  }
}
