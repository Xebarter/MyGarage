import 'package:intl/intl.dart';

final _ugx = NumberFormat.currency(locale: 'en_UG', symbol: 'UGX ', decimalDigits: 0);
final _date = DateFormat('dd MMM yyyy');
final _dateTime = DateFormat('dd MMM · HH:mm');

String formatUgx(num amount) => _ugx.format(amount);

String formatDate(DateTime? value) {
  if (value == null) return '—';
  return _date.format(value.toLocal());
}

String formatDateTime(DateTime? value) {
  if (value == null) return '—';
  return _dateTime.format(value.toLocal());
}

String statusLabel(String status) {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'matched':
      return 'Matched';
    case 'in_progress':
      return 'In progress';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}
