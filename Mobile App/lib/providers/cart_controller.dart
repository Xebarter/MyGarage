import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/models.dart';
import '../utils/media_url.dart';

const _cartKey = 'mygarage_cart_v1';
const _heldCartKey = 'mygarage_cart_held_v1';

class CartController extends ChangeNotifier {
  final List<CartItem> _items = [];
  List<CartItem> _held = [];
  bool hydrated = false;

  List<CartItem> get items => List.unmodifiable(_items);

  int get itemCount => _items.fold(0, (sum, i) => sum + i.quantity);

  double get subtotal => _items.fold(0.0, (sum, i) => sum + i.lineTotal);

  int quantityOf(String productId) {
    for (final item in _items) {
      if (item.productId == productId) return item.quantity;
    }
    return 0;
  }

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    _items
      ..clear()
      ..addAll(_decodeItems(prefs.getString(_cartKey)));
    _held = _decodeItems(prefs.getString(_heldCartKey));
    hydrated = true;
    notifyListeners();
  }

  List<CartItem> _decodeItems(String? raw) {
    if (raw == null || raw.isEmpty) return [];
    try {
      final list = jsonDecode(raw) as List<dynamic>;
      return list
          .whereType<Map>()
          .map((e) => CartItem.fromJson(Map<String, dynamic>.from(e)))
          .map((item) => item.copyWith(image: resolveMediaUrl(item.image)))
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _cartKey,
      jsonEncode(_items.map((e) => e.toJson()).toList()),
    );
  }

  Future<void> _persistHeld() async {
    final prefs = await SharedPreferences.getInstance();
    if (_held.isEmpty) {
      await prefs.remove(_heldCartKey);
      return;
    }
    await prefs.setString(
      _heldCartKey,
      jsonEncode(_held.map((e) => e.toJson()).toList()),
    );
  }

  Future<void> add(Product product, {int quantity = 1}) async {
    final img = resolveMediaUrl(product.image);
    final idx = _items.indexWhere((e) => e.productId == product.id);
    if (idx >= 0) {
      final current = _items[idx];
      _items[idx] = current.copyWith(
        quantity: current.quantity + quantity,
        image: current.image.isEmpty ? img : current.image,
      );
    } else {
      _items.add(
        CartItem(
          productId: product.id,
          name: product.name,
          price: product.price,
          image: img,
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

  Future<void> holdAndClearForCheckout() async {
    _held = List<CartItem>.from(_items);
    await _persistHeld();
    await clear();
  }

  void confirmHeldCheckout() {
    _held = [];
    unawaited(_persistHeld());
  }

  void restoreHeldCheckout() {
    if (_held.isEmpty) return;
    if (_items.isEmpty) {
      _items.addAll(_held);
      notifyListeners();
      unawaited(_persist());
    }
    _held = [];
    unawaited(_persistHeld());
  }
}
