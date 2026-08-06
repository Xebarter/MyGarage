import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/models.dart';

const _cartKey = 'mygarage_cart_v1';

class CartController extends ChangeNotifier {
  final List<CartItem> _items = [];
  bool hydrated = false;

  List<CartItem> get items => List.unmodifiable(_items);

  int get itemCount => _items.fold(0, (sum, i) => sum + i.quantity);

  double get subtotal => _items.fold(0.0, (sum, i) => sum + i.lineTotal);

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_cartKey);
    _items.clear();
    if (raw != null && raw.isNotEmpty) {
      try {
        final list = jsonDecode(raw) as List<dynamic>;
        for (final e in list) {
          if (e is Map) {
            _items.add(CartItem.fromJson(Map<String, dynamic>.from(e)));
          }
        }
      } catch (_) {
        _items.clear();
      }
    }
    hydrated = true;
    notifyListeners();
  }

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _cartKey,
      jsonEncode(_items.map((e) => e.toJson()).toList()),
    );
  }

  Future<void> add(Product product, {int quantity = 1}) async {
    final idx = _items.indexWhere((e) => e.productId == product.id);
    if (idx >= 0) {
      final current = _items[idx];
      _items[idx] = current.copyWith(quantity: current.quantity + quantity);
    } else {
      _items.add(
        CartItem(
          productId: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          quantity: quantity,
        ),
      );
    }
    notifyListeners();
    await _persist();
  }

  Future<void> setQuantity(String productId, int quantity) async {
    final idx = _items.indexWhere((e) => e.productId == productId);
    if (idx < 0) return;
    if (quantity <= 0) {
      _items.removeAt(idx);
    } else {
      _items[idx] = _items[idx].copyWith(quantity: quantity);
    }
    notifyListeners();
    await _persist();
  }

  Future<void> remove(String productId) async {
    _items.removeWhere((e) => e.productId == productId);
    notifyListeners();
    await _persist();
  }

  Future<void> clear() async {
    _items.clear();
    notifyListeners();
    await _persist();
  }
}
