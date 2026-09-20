import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../theme/app_theme.dart';

final _ugx =
    NumberFormat.currency(locale: 'en_UG', symbol: 'UGX ', decimalDigits: 0);
final _date = DateFormat('dd MMM yyyy');
final _dateTime = DateFormat('dd MMM · HH:mm');
final _time = DateFormat('HH:mm');

String formatUgx(num amount) => _ugx.format(amount);

String formatDate(DateTime? value) {
  if (value == null) return '—';
  return _date.format(value.toLocal());
}

String formatDateTime(DateTime? value) {
  if (value == null) return '—';
  return _dateTime.format(value.toLocal());
}

String formatRelativeTime(DateTime? value) {
  if (value == null) return '—';
  final local = value.toLocal();
  final now = DateTime.now();
  final diff = now.difference(local);
  if (diff.inMinutes < 1) return 'Just now';
  if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
  final sameDay = local.year == now.year &&
      local.month == now.month &&
      local.day == now.day;
  if (sameDay) return 'Today · ${_time.format(local)}';
  final yesterday = now.subtract(const Duration(days: 1));
  if (local.year == yesterday.year &&
      local.month == yesterday.month &&
      local.day == yesterday.day) {
    return 'Yesterday · ${_time.format(local)}';
  }
  if (diff.inDays < 7) return '${diff.inDays}d ago';
  return formatDateTime(local);
}

String shortOrderId(String id) {
  final compact = id.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '');
  if (compact.length <= 6) return compact.toUpperCase();
  return compact.substring(compact.length - 6).toUpperCase();
}

String statusLabel(String status) {
  switch (status) {
    case 'pending':
    case 'pending_fulfillment':
      return 'New';
    case 'processing':
      return 'Processing';
    case 'shipped':
      return 'In transit';
    case 'delivered':
      return 'Delivered';
    case 'cancelled':
      return 'Cancelled';
    case 'refunded':
      return 'Refunded';
    default:
      return status.replaceAll('_', ' ');
  }
}

Color orderStatusColor(String status) {
  switch (status) {
    case 'pending':
    case 'pending_fulfillment':
      return AppColors.warning;
    case 'processing':
      return AppColors.primary;
    case 'shipped':
      return AppColors.textSecondary;
    case 'delivered':
      return AppColors.success;
    case 'cancelled':
    case 'refunded':
      return AppColors.danger;
    default:
      return AppColors.textMuted;
  }
}

bool orderNeedsAction(String status) {
  switch (status) {
    case 'pending':
    case 'pending_fulfillment':
    case 'processing':
      return true;
    default:
      return false;
  }
}

String orderNextActionLabel(String status) {
  switch (status) {
    case 'pending':
    case 'pending_fulfillment':
      return 'Start packing';
    case 'processing':
      return 'Add tracking';
    case 'shipped':
      return 'Confirm delivery';
    default:
      return 'View details';
  }
}
