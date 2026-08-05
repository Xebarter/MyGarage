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

/// Per-category soft brand colors for service listings (light premium).
const Map<String, AccentPair> kServiceCategoryAccents = {
  'emergency-help': AccentPair(
    accent: Color(0xFFDC2626),
    fill: Color(0xFFFEF2F2),
    border: Color(0xFFFECACA),
    iconBg: Color(0xFFFEE2E2),
  ),
  'fix-my-car': AccentPair(
    accent: Color(0xFF2563EB),
    fill: Color(0xFFEFF6FF),
    border: Color(0xFFBFDBFE),
    iconBg: Color(0xFFDBEAFE),
  ),
  'service-my-car': AccentPair(
    accent: Color(0xFF059669),
    fill: Color(0xFFECFDF5),
    border: Color(0xFFA7F3D0),
    iconBg: Color(0xFFD1FAE5),
  ),
  'tyres-battery': AccentPair(
    accent: Color(0xFFD97706),
    fill: Color(0xFFFFFBEB),
    border: Color(0xFFFDE68A),
    iconBg: Color(0xFFFEF3C7),
  ),
  'car-wash-cleaning': AccentPair(
    accent: Color(0xFF0891B2),
    fill: Color(0xFFECFEFF),
    border: Color(0xFFA5F3FC),
    iconBg: Color(0xFFCFFAFE),
  ),
  'body-repair-painting': AccentPair(
    accent: Color(0xFF7C3AED),
    fill: Color(0xFFF5F3FF),
    border: Color(0xFFDDD6FE),
    iconBg: Color(0xFFEDE9FE),
  ),
  'ac-cooling': AccentPair(
    accent: Color(0xFF0284C7),
    fill: Color(0xFFF0F9FF),
    border: Color(0xFFBAE6FD),
    iconBg: Color(0xFFE0F2FE),
  ),
  'security-tracking': AccentPair(
    accent: Color(0xFF4F46E5),
    fill: Color(0xFFEEF2FF),
    border: Color(0xFFC7D2FE),
    iconBg: Color(0xFFE0E7FF),
  ),
  'documents-insurance': AccentPair(
    accent: Color(0xFF0F766E),
    fill: Color(0xFFF0FDFA),
    border: Color(0xFF99F6E4),
    iconBg: Color(0xFFCCFBF1),
  ),
  'drivers-transport': AccentPair(
    accent: Color(0xFFB45309),
    fill: Color(0xFFFFF7ED),
    border: Color(0xFFFED7AA),
    iconBg: Color(0xFFFFEDD5),
  ),
  'fuel-delivery': AccentPair(
    accent: Color(0xFFC2410C),
    fill: Color(0xFFFFF7ED),
    border: Color(0xFFFDBA74),
    iconBg: Color(0xFFFED7AA),
  ),
  'rent-buy-car': AccentPair(
    accent: Color(0xFF1D4ED8),
    fill: Color(0xFFEFF6FF),
    border: Color(0xFF93C5FD),
    iconBg: Color(0xFFDBEAFE),
  ),
  'upgrade-my-car': AccentPair(
    accent: Color(0xFFBE185D),
    fill: Color(0xFFFDF2F8),
    border: Color(0xFFFBCFE8),
    iconBg: Color(0xFFFCE7F3),
  ),
};

const _fallbackAccents = <AccentPair>[
  AccentPair(
    accent: Color(0xFF2563EB),
    fill: Color(0xFFEFF6FF),
    border: Color(0xFFBFDBFE),
    iconBg: Color(0xFFDBEAFE),
  ),
  AccentPair(
    accent: Color(0xFF059669),
    fill: Color(0xFFECFDF5),
    border: Color(0xFFA7F3D0),
    iconBg: Color(0xFFD1FAE5),
  ),
  AccentPair(
    accent: Color(0xFFD97706),
    fill: Color(0xFFFFFBEB),
    border: Color(0xFFFDE68A),
    iconBg: Color(0xFFFEF3C7),
  ),
  AccentPair(
    accent: Color(0xFF7C3AED),
    fill: Color(0xFFF5F3FF),
    border: Color(0xFFDDD6FE),
    iconBg: Color(0xFFEDE9FE),
  ),
  AccentPair(
    accent: Color(0xFF0891B2),
    fill: Color(0xFFECFEFF),
    border: Color(0xFFA5F3FC),
    iconBg: Color(0xFFCFFAFE),
  ),
  AccentPair(
    accent: Color(0xFFBE185D),
    fill: Color(0xFFFDF2F8),
    border: Color(0xFFFBCFE8),
    iconBg: Color(0xFFFCE7F3),
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
