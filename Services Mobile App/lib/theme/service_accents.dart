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
    accent: Color(0xFF3D5F7A),
    fill: Color(0xFFE8EEF3),
    border: Color(0xFFC5D3DE),
    iconBg: Color(0xFFD5E1EA),
  ),
  'service-my-car': AccentPair(
    accent: Color(0xFF2E7D5B),
    fill: Color(0xFFE3F3EB),
    border: Color(0xFFB7DCC8),
    iconBg: Color(0xFFC9E6D6),
  ),
  'tyres-battery': AccentPair(
    accent: Color(0xFFB07D2E),
    fill: Color(0xFFF6EFE0),
    border: Color(0xFFE6D3A8),
    iconBg: Color(0xFFEEE0C0),
  ),
  'car-wash-cleaning': AccentPair(
    accent: Color(0xFF2E7A7A),
    fill: Color(0xFFE3F1F1),
    border: Color(0xFFB5D6D6),
    iconBg: Color(0xFFC7E2E2),
  ),
  'body-repair-painting': AccentPair(
    accent: Color(0xFF6E6458),
    fill: Color(0xFFF3EFE8),
    border: Color(0xFFD8D0C4),
    iconBg: Color(0xFFE6DFD4),
  ),
  'ac-cooling': AccentPair(
    accent: Color(0xFF3D7A8A),
    fill: Color(0xFFE6F1F4),
    border: Color(0xFFB8D5DE),
    iconBg: Color(0xFFCBE2E8),
  ),
  'security-tracking': AccentPair(
    accent: Color(0xFF1F4A48),
    fill: Color(0xFFE4EEED),
    border: Color(0xFFB8CECC),
    iconBg: Color(0xFFC9DCDA),
  ),
  'documents-insurance': AccentPair(
    accent: Color(0xFF2F6B62),
    fill: Color(0xFFE4F0ED),
    border: Color(0xFFB6D4CE),
    iconBg: Color(0xFFC8E0DB),
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
    accent: Color(0xFF3D5A6E),
    fill: Color(0xFFE8EEF2),
    border: Color(0xFFC0D0DA),
    iconBg: Color(0xFFD0DDE4),
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
    accent: Color(0xFF3D5F7A),
    fill: Color(0xFFE8EEF3),
    border: Color(0xFFC5D3DE),
    iconBg: Color(0xFFD5E1EA),
  ),
  AccentPair(
    accent: Color(0xFF2E7D5B),
    fill: Color(0xFFE3F3EB),
    border: Color(0xFFB7DCC8),
    iconBg: Color(0xFFC9E6D6),
  ),
  AccentPair(
    accent: Color(0xFFB07D2E),
    fill: Color(0xFFF6EFE0),
    border: Color(0xFFE6D3A8),
    iconBg: Color(0xFFEEE0C0),
  ),
  AccentPair(
    accent: Color(0xFF6E6458),
    fill: Color(0xFFF3EFE8),
    border: Color(0xFFD8D0C4),
    iconBg: Color(0xFFE6DFD4),
  ),
  AccentPair(
    accent: Color(0xFF2E7A7A),
    fill: Color(0xFFE3F1F1),
    border: Color(0xFFB5D6D6),
    iconBg: Color(0xFFC7E2E2),
  ),
  AccentPair(
    accent: Color(0xFF7A4A62),
    fill: Color(0xFFF4E8EE),
    border: Color(0xFFDCC4D0),
    iconBg: Color(0xFFE8D2DC),
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
      return Icons.auto_awesome_outlined;
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
