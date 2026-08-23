import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../api/api_client.dart';
import '../api/buyer_api.dart';
import '../models/models.dart';

const _productsKey = 'mygarage_shop_products_v1';
const _treeKey = 'mygarage_shop_category_tree_v1';
const _fetchedAtKey = 'mygarage_shop_fetched_at_v1';

/// Shared shop catalog: disk cache + in-memory, prefetched at app start.
/// Shop page paints cache immediately and refreshes in the background.
class ShopCatalogController extends ChangeNotifier {
  ShopCatalogController({BuyerApi? api}) : _api = api ?? BuyerApi(ApiClient());

  final BuyerApi _api;

  List<Product> _products = [];
  List<ShopCategoryNode> _categoryTree = [];
  String? _error;
  bool _networkLoading = false;
  bool _started = false;
  DateTime? _lastNetworkOk;
  Future<void>? _inFlight;

  List<Product> get products => _products;
  List<ShopCategoryNode> get categoryTree => _categoryTree;
  String? get error => _error;
  bool get networkLoading => _networkLoading;
  bool get hasProducts => _products.isNotEmpty;
  bool get hasTree => _categoryTree.isNotEmpty;

  /// Only block the UI spinner when we have nothing to show yet.
  bool get showBlockingLoader => !hasProducts && _networkLoading;

  final Map<String, Product> _detailCache = {};

  /// Instant lookup for product detail (list cache → detail cache).
  Product? productById(String id) {
    final key = id.trim();
    if (key.isEmpty) return null;
    for (final p in _products) {
      if (p.id == key) return p;
    }
    return _detailCache[key];
  }

  void cacheProduct(Product product) {
    if (product.id.isEmpty) return;
    _detailCache[product.id] = product;
    final i = _products.indexWhere((p) => p.id == product.id);
    if (i >= 0) {
      _products[i] = product;
    }
  }

  Future<Product> fetchProduct(String id, {bool forceNetwork = false}) async {
    final key = id.trim();
    if (!forceNetwork) {
      final cached = productById(key);
      if (cached != null) {
        // Stale-while-revalidate in the background.
        // ignore: discarded_futures
        _api.getProduct(key).then((fresh) {
          cacheProduct(fresh);
          notifyListeners();
        }).catchError((_) {});
        return cached;
      }
    }
    final fresh = await _api.getProduct(key);
    cacheProduct(fresh);
    notifyListeners();
    return fresh;
  }

  /// Call once from [main] so Shop is warm before the tab is opened.
  Future<void> start() {
    if (_started) return _inFlight ?? Future.value();
    _started = true;
    return _bootstrap();
  }

  Future<void> _bootstrap() async {
    await _hydrateDisk();
    await refresh(force: true);
  }

  /// Ensure data is loading / fresh when Shop mounts.
  Future<void> ensureReady({bool force = false}) {
    if (!_started) return start();
    if (force || !_isFresh) return refresh(force: force);
    if (!hasProducts) return refresh(force: true);
    return Future.value();
  }

  bool get _isFresh {
    final t = _lastNetworkOk;
    if (t == null) return false;
    return DateTime.now().difference(t) < const Duration(minutes: 5);
  }

  Future<void> _hydrateDisk() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final rawProducts = prefs.getString(_productsKey);
      final rawTree = prefs.getString(_treeKey);
      final fetchedMs = prefs.getInt(_fetchedAtKey);

      if (rawProducts != null && rawProducts.isNotEmpty) {
        final decoded = jsonDecode(rawProducts);
        if (decoded is List) {
          _products = decoded
              .whereType<Map>()
              .map((e) => Product.fromJson(Map<String, dynamic>.from(e)))
              .where((p) => p.id.isNotEmpty)
              .toList();
        }
      }
      if (rawTree != null && rawTree.isNotEmpty) {
        final decoded = jsonDecode(rawTree);
        if (decoded is List) {
          _categoryTree = decoded
              .whereType<Map>()
              .map((e) => ShopCategoryNode.fromJson(Map<String, dynamic>.from(e)))
              .where((n) => n.title.trim().isNotEmpty)
              .toList();
        }
      }
      if (fetchedMs != null && fetchedMs > 0) {
        _lastNetworkOk = DateTime.fromMillisecondsSinceEpoch(fetchedMs);
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[ShopCatalog] disk hydrate failed: $e');
      }
    } finally {
      if (_products.isNotEmpty || _categoryTree.isNotEmpty) {
        notifyListeners();
      }
    }
  }

  Future<void> refresh({bool force = false}) {
    if (_inFlight != null && !force) return _inFlight!;
    if (_inFlight != null && force) {
      // Let the current request finish; still ok for pull-to-refresh to wait.
      return _inFlight!.then((_) => _refreshNetwork());
    }
    return _refreshNetwork();
  }

  Future<void> _refreshNetwork() {
    final run = () async {
      _networkLoading = true;
      if (!hasProducts) {
        // Only clear residual error while spinner shows empty.
        _error = null;
        notifyListeners();
      }
      try {
        final productsFuture = _api.listProducts();
        final treeFuture = _api.fetchShopCategoryTree();
        final products = await productsFuture;
        List<ShopCategoryNode> tree = const [];
        try {
          tree = await treeFuture;
        } catch (_) {
          tree = const [];
        }

        _products = products;
        _categoryTree = tree;
        _error = null;
        _lastNetworkOk = DateTime.now();
        _networkLoading = false;
        notifyListeners();
        await _persistDisk();
      } catch (e) {
        _networkLoading = false;
        if (!hasProducts) {
          _error = e.toString();
        }
        notifyListeners();
      } finally {
        _inFlight = null;
      }
    }();
    _inFlight = run;
    return run;
  }

  Future<void> _persistDisk() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        _productsKey,
        jsonEncode(_products.map((p) => p.toJson()).toList()),
      );
      await prefs.setString(
        _treeKey,
        jsonEncode(_categoryTree.map((n) => n.toJson()).toList()),
      );
      if (_lastNetworkOk != null) {
        await prefs.setInt(
          _fetchedAtKey,
          _lastNetworkOk!.millisecondsSinceEpoch,
        );
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[ShopCatalog] persist failed: $e');
      }
    }
  }

  Future<List<ShopCategoryNode>> reloadCategoryTree() async {
    final tree = await _api.fetchShopCategoryTree();
    _categoryTree = tree;
    notifyListeners();
    await _persistDisk();
    return tree;
  }
}
