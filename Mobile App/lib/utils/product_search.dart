import '../models/models.dart';

/// Tokenize a user query for product ranking (mirrors shop/search UX on web).
List<String> searchTokens(String raw) {
  final seen = <String>{};
  final out = <String>[];
  for (final part in raw.toLowerCase().split(RegExp(r'\s+'))) {
    final t = part.replaceAll(RegExp(r'[^a-z0-9+-]'), '');
    if (t.length < 2 || seen.contains(t)) continue;
    seen.add(t);
    out.add(t);
    if (out.length >= 6) break;
  }
  return out;
}

int _fieldScore(String hay, String token, int weight) {
  if (hay.isEmpty || token.isEmpty) return 0;
  if (hay == token) return weight * 10;
  if (hay.startsWith('$token ') || hay.startsWith('$token-') || hay.startsWith('$token(')) {
    return weight * 7;
  }
  if (hay.startsWith(token)) return weight * 6;
  final boundary = RegExp('(^|[^a-z0-9])${RegExp.escape(token)}([^a-z0-9]|\$)');
  if (boundary.hasMatch(hay)) return weight * 4;
  if (hay.contains(token)) return weight;
  return 0;
}

/// Score how well [product] matches [query]. Higher is better; 0 = no match.
int scoreProduct(Product product, String query) {
  final q = query.trim().toLowerCase();
  if (q.isEmpty) return 1;

  final name = product.name.toLowerCase();
  final brand = product.brand.toLowerCase();
  final category = product.category.toLowerCase();
  final desc = product.description.toLowerCase();
  final tokens = searchTokens(q);
  final effective = tokens.isNotEmpty ? tokens : (q.length >= 2 ? [q] : <String>[]);

  var score = 0;
  if (q.length >= 2 && name.contains(q)) {
    score += 28;
  } else if (q.length >= 2 && '$brand $category'.contains(q)) {
    score += 6;
  }

  var allInName = effective.isNotEmpty;
  for (final tok in effective) {
    final inName = _fieldScore(name, tok, 12);
    final inBrand = _fieldScore(brand, tok, 7);
    final inCat = _fieldScore(category, tok, 6);
    final inDesc = _fieldScore(desc, tok, 2);
    final best = [inName, inBrand, inCat, inDesc].reduce((a, b) => a > b ? a : b);
    score += best;
    if (inName < 1) allInName = false;
  }

  if (effective.length >= 2 && allInName) score += 18;
  if (effective.length >= 2 && name.contains(q)) score += 12;
  return score;
}

/// Filter/rank products by free-text query and optional category chip.
List<Product> filterProducts(
  List<Product> catalog, {
  required String query,
  String? category,
}) {
  final cat = category?.trim();
  Iterable<Product> base = catalog;
  if (cat != null && cat.isNotEmpty) {
    final c = cat.toLowerCase();
    base = base.where((p) => p.category.toLowerCase() == c);
  }

  final q = query.trim();
  if (q.isEmpty) return base.toList();

  final scored = <({Product product, int score})>[];
  for (final p in base) {
    final s = scoreProduct(p, q);
    if (s > 0) scored.add((product: p, score: s));
  }
  scored.sort((a, b) {
    final byScore = b.score.compareTo(a.score);
    if (byScore != 0) return byScore;
    return a.product.name.toLowerCase().compareTo(b.product.name.toLowerCase());
  });
  return scored.map((e) => e.product).toList();
}

List<String> catalogCategories(List<Product> catalog) {
  final map = <String, int>{};
  for (final p in catalog) {
    final name = p.category.trim();
    if (name.isEmpty) continue;
    map[name] = (map[name] ?? 0) + 1;
  }
  final names = map.keys.toList()
    ..sort((a, b) {
      final byCount = (map[b] ?? 0).compareTo(map[a] ?? 0);
      if (byCount != 0) return byCount;
      return a.toLowerCase().compareTo(b.toLowerCase());
    });
  return names;
}
