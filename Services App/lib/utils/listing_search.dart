import '../models/service_listing.dart';
import '../theme/service_accents.dart';

const _stopWords = {
  'a',
  'an',
  'and',
  'for',
  'the',
  'with',
  'my',
  'car',
  'auto',
  'vehicle',
};

const _synonymGroups = <List<String>>[
  ['tyre', 'tire', 'tyres', 'tires'],
  ['petrol', 'gasoline', 'gas', 'fuel'],
  ['brake', 'brakes'],
  ['battery', 'batteries'],
  ['ac', 'aircon', 'cooling'],
  ['tow', 'towing'],
  ['wash', 'washing', 'cleaning', 'detail'],
  ['oil', 'service', 'maintenance'],
  ['tracker', 'tracking', 'gps', 'alarm'],
  ['paint', 'dent', 'scratch', 'body'],
];

String _normalize(String value) {
  return value
      .toLowerCase()
      .replaceAll(RegExp(r'[^a-z0-9\s+-]'), ' ')
      .replaceAll(RegExp(r'\s+'), ' ')
      .trim();
}

List<String> _tokens(String raw) {
  final out = <String>[];
  final seen = <String>{};
  for (final part in _normalize(raw).split(' ')) {
    if (part.length < 2 || _stopWords.contains(part) || seen.contains(part)) continue;
    seen.add(part);
    out.add(part);
    for (final group in _synonymGroups) {
      if (!group.contains(part)) continue;
      for (final syn in group) {
        if (syn.length >= 2 && seen.add(syn)) out.add(syn);
      }
    }
    if (out.length >= 12) break;
  }
  return out;
}

int _fieldScore(String hay, String token, int weight) {
  if (hay.isEmpty || token.isEmpty) return 0;
  if (hay == token) return weight * 10;
  if (hay.startsWith(token)) return weight * 6;
  if (RegExp('(^|[^a-z0-9])${RegExp.escape(token)}([^a-z0-9]|\$)').hasMatch(hay)) {
    return weight * 4;
  }
  if (hay.contains(token)) return weight;
  return 0;
}

/// Score how well a listing matches [query]. 0 = no match.
int scoreListing(ServiceListing listing, String query) {
  final q = _normalize(query);
  if (q.isEmpty) return 1;

  final name = listing.serviceName.toLowerCase();
  final cat = categoryTitle(listing.categoryId).toLowerCase();
  final useWhen = (categoryOptionById(listing.categoryId)?.useWhen ?? '').toLowerCase();
  final status = listing.isActive ? 'active' : 'paused';
  final flags = [
    if (listing.mobileAvailable) 'mobile',
    if (listing.emergency) 'emergency',
    status,
  ].join(' ');
  final tokens = _tokens(q);
  final effective = tokens.isNotEmpty ? tokens : (q.length >= 2 ? [q] : <String>[]);

  var score = 0;
  if (q.length >= 2 && name.contains(q)) score += 28;
  if (q.length >= 2 && cat.contains(q)) score += 14;

  for (final tok in effective) {
    score += _fieldScore(name, tok, 14);
    score += _fieldScore(cat, tok, 7);
    score += _fieldScore(useWhen, tok, 4);
    score += _fieldScore(flags, tok, 5);
    score += _fieldScore(listing.categoryId.replaceAll('-', ' '), tok, 3);
  }
  return score;
}

List<ServiceListing> filterListings(
  List<ServiceListing> listings, {
  required String query,
  bool? activeOnly,
  bool? pausedOnly,
}) {
  Iterable<ServiceListing> base = listings;
  if (activeOnly == true) base = base.where((l) => l.isActive);
  if (pausedOnly == true) base = base.where((l) => !l.isActive);

  final q = query.trim();
  if (q.isEmpty) return base.toList();

  final scored = <({ServiceListing listing, int score})>[];
  for (final l in base) {
    final s = scoreListing(l, q);
    if (s > 0) scored.add((listing: l, score: s));
  }
  scored.sort((a, b) {
    final byScore = b.score.compareTo(a.score);
    if (byScore != 0) return byScore;
    return a.listing.serviceName.toLowerCase().compareTo(b.listing.serviceName.toLowerCase());
  });
  return scored.map((e) => e.listing).toList();
}
