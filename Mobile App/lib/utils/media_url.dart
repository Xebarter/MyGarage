import '../config.dart';

/// Resolves relative product media paths against the API origin.
String resolveMediaUrl(String? path) {
  final raw = path?.trim() ?? '';
  if (raw.isEmpty) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (raw.startsWith('//')) return 'https:$raw';
  final base = AppConfig.apiUrl.replaceAll(RegExp(r'/+$'), '');
  if (raw.startsWith('/')) return '$base$raw';
  return '$base/$raw';
}
