String myGarageDeepLinkKey(Uri uri) {
  if (uri.scheme == 'mygarage') {
    final host = uri.host;
    final path = uri.path.replaceAll(RegExp(r'^/+|/+$'), '');
    if (host.isEmpty) return path;
    if (path.isEmpty) return host;
    return '$host/$path';
  }

  final segments = uri.pathSegments.where((s) => s.isNotEmpty).toList();
  if (segments.length >= 2 &&
      segments[0] == 'checkout' &&
      (segments[1] == 'complete' || segments[1] == 'failed')) {
    return 'checkout/${segments[1]}';
  }
  if (segments.length == 1 &&
      (segments[0] == 'complete' || segments[0] == 'failed') &&
      uri.host == 'checkout') {
    return 'checkout/${segments[0]}';
  }
  return '';
}
