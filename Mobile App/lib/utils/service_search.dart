import '../data/services_catalog.dart';
import '../models/models.dart';

/// Bidirectional automotive synonym groups (aligned with web `expand-query.ts`).
const List<List<String>> _synonymGroups = [
  ['tyre', 'tire', 'tyres', 'tires'],
  ['petrol', 'gasoline', 'gas'],
  ['brake', 'brakes'],
  ['battery', 'batteries', 'accumulator'],
  ['gearbox', 'transmission', 'gear box'],
  ['radiator', 'radiators'],
  ['ac', 'air conditioning', 'aircon'],
  ['tow', 'towing', 'towed'],
  ['wash', 'washing', 'cleaning'],
  ['tracker', 'tracking', 'gps'],
];

const Set<String> _stopWords = {
  'a',
  'an',
  'and',
  'for',
  'the',
  'with',
  'car',
  'auto',
  'vehicle',
  'my',
  'me',
  'i',
  'im',
  'need',
  'help',
};

class MatchedCatalogService {
  const MatchedCatalogService({
    required this.name,
    required this.category,
    required this.score,
  });

  final String name;
  final ServiceCategory category;
  final int score;
}

class MatchedCatalogCategory {
  const MatchedCatalogCategory({
    required this.category,
    required this.matchingServiceCount,
    required this.score,
  });

  final ServiceCategory category;
  final int matchingServiceCount;
  final int score;
}

class BuyerServicesSearchResult {
  const BuyerServicesSearchResult({
    required this.query,
    required this.categories,
    required this.services,
  });

  final String query;
  final List<MatchedCatalogCategory> categories;
  final List<MatchedCatalogService> services;
}

String _normalize(String value) {
  return value
      .toLowerCase()
      .replaceAll(RegExp(r'[%,]'), ' ')
      .replaceAll(RegExp(r'[^a-z0-9\s-]'), ' ')
      .replaceAll(RegExp(r'[-_]+'), ' ')
      .replaceAll(RegExp(r'\s+'), ' ')
      .trim();
}

String _singularize(String token) {
  if (token.length <= 3) return token;
  if (token.endsWith('ies') && token.length > 4) {
    return '${token.substring(0, token.length - 3)}y';
  }
  if (token.endsWith('ses') && token.length > 4) {
    return token.substring(0, token.length - 2);
  }
  if (token.endsWith('es') && token.length > 4) {
    return token.substring(0, token.length - 1);
  }
  if (token.endsWith('s') && !token.endsWith('ss')) {
    return token.substring(0, token.length - 1);
  }
  return token;
}

List<String> _rankingTokens(String safeQ) {
  final primary = <String>[];
  final seen = <String>{};
  for (final part in safeQ.split(RegExp(r'\s+'))) {
    final t = part.replaceAll(RegExp(r'[^a-z0-9]'), '');
    if (t.length < 2 || _stopWords.contains(t) || seen.contains(t)) continue;
    for (final variant in [t, _singularize(t)]) {
      if (variant.length < 2 || seen.contains(variant)) continue;
      seen.add(variant);
      primary.add(variant);
      if (primary.length >= 8) break;
    }
    if (primary.length >= 8) break;
  }

  final ranking = <String>{...primary};
  for (final token in [...primary]) {
    for (final group in _synonymGroups) {
      final norms = group.map(_normalize).where((g) => g.isNotEmpty).toList();
      if (!norms.contains(token) && !norms.contains(_singularize(token))) continue;
      for (final syn in norms) {
        for (final part in syn.split(RegExp(r'\s+'))) {
          if (part.length >= 2) ranking.add(part);
        }
      }
    }
  }

  return ranking.take(16).toList();
}

int _fieldScore(String hay, String token, int weight) {
  if (hay.isEmpty || token.isEmpty) return 0;
  if (hay == token) return weight * 10;
  if (hay.startsWith('$token ') ||
      hay.startsWith('$token-') ||
      hay.startsWith('$token(')) {
    return weight * 7;
  }
  if (hay.startsWith(token)) return weight * 6;
  final boundary = RegExp('(^|[^a-z0-9])${RegExp.escape(token)}([^a-z0-9]|\$)');
  if (boundary.hasMatch(hay)) return weight * 4;
  if (hay.contains(token)) return weight;
  return 0;
}

int _scoreService({
  required String serviceName,
  required ServiceCategory category,
  required List<String> keywords,
  required String qLower,
  required List<String> tokens,
}) {
  final svc = serviceName.toLowerCase();
  final title = category.title.toLowerCase();
  final idNorm = category.id.toLowerCase().replaceAll('-', ' ');
  final kwBlob = keywords.map((k) => k.toLowerCase()).join(' ');
  final effective = tokens.isNotEmpty
      ? tokens
      : (qLower.length >= 2 ? [qLower] : <String>[]);

  var score = 0;
  if (qLower.length >= 2 && svc.contains(qLower)) score += 24;

  for (final tok in effective) {
    score += _fieldScore(svc, tok, 14);
    score += _fieldScore(title, tok, 6);
    score += _fieldScore(idNorm, tok, 4);
    score += _fieldScore(kwBlob, tok, 5);
  }

  if (effective.length >= 2 && effective.every(svc.contains)) score += 14;
  return score;
}

int _scoreCategory({
  required ServiceCategory category,
  required List<String> keywords,
  required String qLower,
  required List<String> tokens,
  required int bestServiceScore,
  required int matchingServiceCount,
}) {
  final title = category.title.toLowerCase();
  final useWhen = category.useWhen.toLowerCase();
  final idNorm = category.id.toLowerCase().replaceAll('-', ' ');
  final kwBlob = keywords.map((k) => k.toLowerCase()).join(' ');
  final effective = tokens.isNotEmpty
      ? tokens
      : (qLower.length >= 2 ? [qLower] : <String>[]);

  var score = bestServiceScore > 0 ? (bestServiceScore * 0.55).floor() : 0;
  if (qLower.length >= 2 && title.contains(qLower)) score += 28;
  if (qLower.length >= 2 && useWhen.contains(qLower)) score += 10;
  if (qLower.length >= 2 && idNorm.contains(qLower)) score += 12;

  for (final tok in effective) {
    score += _fieldScore(title, tok, 12);
    score += _fieldScore(useWhen, tok, 4);
    score += _fieldScore(idNorm, tok, 6);
    score += _fieldScore(kwBlob, tok, 7);
  }

  if (matchingServiceCount > 0) {
    score += matchingServiceCount * 3 > 18 ? 18 : matchingServiceCount * 3;
  }
  if (category.priority == 'urgent') score += 2;
  return score;
}

/// Live catalog search for the buyer Services tab.
BuyerServicesSearchResult searchBuyerServicesCatalog(
  String query, {
  int serviceLimit = 20,
}) {
  final safeQ = _normalize(query);
  if (safeQ.isEmpty || safeQ.length < 2) {
    return BuyerServicesSearchResult(
      query: safeQ,
      categories: [
        for (final category in userServiceCategories)
          MatchedCatalogCategory(
            category: category,
            matchingServiceCount: category.services.length,
            score: 0,
          ),
      ],
      services: const [],
    );
  }

  final tokens = _rankingTokens(safeQ);
  final services = <MatchedCatalogService>[];
  final categories = <MatchedCatalogCategory>[];

  for (final cat in userServiceCategories) {
    final keywords = serviceIntentKeywordsByCategoryId[cat.id] ?? const [];
    var bestServiceScore = 0;
    var matchingServiceCount = 0;

    for (final service in cat.services) {
      final score = _scoreService(
        serviceName: service.name,
        category: cat,
        keywords: keywords,
        qLower: safeQ,
        tokens: tokens,
      );
      if (score <= 0) continue;
      matchingServiceCount += 1;
      if (score > bestServiceScore) bestServiceScore = score;
      services.add(
        MatchedCatalogService(name: service.name, category: cat, score: score),
      );
    }

    final catScore = _scoreCategory(
      category: cat,
      keywords: keywords,
      qLower: safeQ,
      tokens: tokens,
      bestServiceScore: bestServiceScore,
      matchingServiceCount: matchingServiceCount,
    );
    if (catScore <= 0) continue;

    categories.add(
      MatchedCatalogCategory(
        category: cat,
        matchingServiceCount:
            matchingServiceCount > 0 ? matchingServiceCount : cat.services.length,
        score: catScore,
      ),
    );
  }

  services.sort((a, b) {
    final byScore = b.score.compareTo(a.score);
    if (byScore != 0) return byScore;
    return a.name.toLowerCase().compareTo(b.name.toLowerCase());
  });
  categories.sort((a, b) {
    final byScore = b.score.compareTo(a.score);
    if (byScore != 0) return byScore;
    return a.category.title.toLowerCase().compareTo(b.category.title.toLowerCase());
  });

  final limit = serviceLimit < 1 ? 1 : serviceLimit;
  return BuyerServicesSearchResult(
    query: safeQ,
    categories: categories,
    services: services.take(limit).toList(),
  );
}
