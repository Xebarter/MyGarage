import 'package:flutter/foundation.dart';

import '../config.dart';
import '../models/buyer_control_center.dart';
import '../models/models.dart';
import 'api_client.dart';

class BuyerApi {
  BuyerApi(this._client);

  final ApiClient _client;

  Future<BuyerProfile> fetchProfile({required String email}) {
    return _client.get(
      '/api/buyer/profile',
      query: {'email': email},
      parser: (json) => BuyerProfile.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<BuyerProfile> createProfile({
    required String name,
    required String email,
    String phone = '',
  }) {
    return _client.post(
      '/api/buyer/profile',
      body: {'name': name, 'email': email, 'phone': phone},
      parser: (json) => BuyerProfile.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<BuyerProfile> updateProfile(
    String id, {
    required String name,
    required String email,
    String phone = '',
    String address = '',
  }) {
    return _client.put(
      '/api/buyer/profile/$id',
      body: {
        'name': name,
        'email': email,
        'phone': phone,
        'address': address,
      },
      auth: true,
      parser: (json) => BuyerProfile.fromJson(
        json is Map ? Map<String, dynamic>.from(json) : <String, dynamic>{},
      ),
    );
  }

  Future<void> deleteProfile(String id) async {
    await _client.delete(
      '/api/buyer/profile/$id',
      auth: true,
      parser: (_) => true,
    );
  }

  Future<BuyerControlCenter> fetchControlCenter({required String customerId}) {
    return _client.get(
      '/api/buyer/control-center',
      query: {'customerId': customerId},
      auth: true,
      parser: (json) => BuyerControlCenter.fromJson(
        json is Map ? Map<String, dynamic>.from(json) : <String, dynamic>{},
      ),
    );
  }

  Future<void> patchAccount({
    required String customerId,
    String? preferredContactMethod,
    String? accountStatus,
  }) async {
    final body = <String, dynamic>{'customerId': customerId};
    if (preferredContactMethod != null) {
      body['preferredContactMethod'] = preferredContactMethod;
    }
    if (accountStatus != null) body['accountStatus'] = accountStatus;
    await _client.patch(
      '/api/buyer/account',
      body: body,
      auth: true,
      parser: (_) => true,
    );
  }

  Future<void> patchNotificationPreferences({
    required String customerId,
    required Map<String, dynamic> prefs,
  }) async {
    await _client.patch(
      '/api/buyer/notification-preferences',
      body: {'customerId': customerId, ...prefs},
      auth: true,
      parser: (_) => true,
    );
  }

  Future<void> markNotifications({
    required String customerId,
    String? notificationId,
    bool markAll = false,
  }) async {
    final body = <String, dynamic>{'customerId': customerId};
    if (markAll) {
      body['markAll'] = true;
    } else if (notificationId != null) {
      body['notificationId'] = notificationId;
    }
    await _client.patch(
      '/api/buyer/notifications',
      body: body,
      auth: true,
      parser: (_) => true,
    );
  }

  Future<void> patchPreferences({
    required String customerId,
    required Map<String, dynamic> prefs,
  }) async {
    await _client.patch(
      '/api/buyer/preferences',
      body: {'customerId': customerId, ...prefs},
      auth: true,
      parser: (_) => true,
    );
  }

  Future<Map<String, dynamic>> createSubscription({
    required String customerId,
    required String planTier,
  }) {
    return _client.post(
      '/api/buyer/subscriptions',
      body: {'customerId': customerId, 'planTier': planTier},
      auth: true,
      parser: (json) =>
          json is Map ? Map<String, dynamic>.from(json) : <String, dynamic>{},
    );
  }

  Future<void> cancelSubscription({required String customerId}) async {
    await _client.delete(
      '/api/buyer/subscriptions',
      query: {'customerId': customerId},
      auth: true,
      parser: (_) => true,
    );
  }

  Future<void> deleteVehicleDocument({
    required String id,
    required String customerId,
  }) async {
    await _client.delete(
      '/api/buyer/vehicle-documents/$id',
      query: {'customerId': customerId},
      auth: true,
      parser: (_) => true,
    );
  }

  Future<void> respondRecommendation({
    required String id,
    required String status,
    required String customerId,
  }) async {
    await _client.patch(
      '/api/buyer/service-recommendations/$id',
      body: {'customerId': customerId, 'status': status},
      auth: true,
      parser: (_) => true,
    );
  }

  Future<void> rateProvider({
    required String customerId,
    required String providerId,
    required int stars,
  }) async {
    await _client.post(
      '/api/buyer/provider-ratings',
      body: {
        'customerId': customerId,
        'providerId': providerId,
        'stars': stars,
      },
      auth: true,
      parser: (_) => true,
    );
  }

  Future<List<BuyerAddress>> listAddresses({required String customerId}) {
    return _client.get(
      '/api/buyer/addresses',
      query: {'customerId': customerId},
      auth: true,
      parser: (json) {
        final list = json is List
            ? json
            : (json is Map && json['addresses'] is List
                ? json['addresses'] as List
                : const []);
        return list
            .whereType<Map>()
            .map((e) => BuyerAddress.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      },
    );
  }

  Future<BuyerAddress> createAddress({
    required String customerId,
    required String label,
    required String fullAddress,
    bool isDefault = false,
  }) {
    return _client.post(
      '/api/buyer/addresses',
      body: {
        'customerId': customerId,
        'label': label,
        'fullAddress': fullAddress,
        'isDefault': isDefault,
      },
      auth: true,
      parser: (json) => BuyerAddress.fromJson(
        json is Map ? Map<String, dynamic>.from(json) : <String, dynamic>{},
      ),
    );
  }

  Future<void> setDefaultAddress({
    required String id,
    required String customerId,
  }) async {
    await _client.put(
      '/api/buyer/addresses/$id',
      body: {'customerId': customerId, 'isDefault': true},
      auth: true,
      parser: (_) => true,
    );
  }

  Future<void> deleteAddress(String id) async {
    await _client.delete(
      '/api/buyer/addresses/$id',
      auth: true,
      parser: (_) => true,
    );
  }

  Future<List<WishlistItem>> listWishlist({required String customerId}) {
    return _client.get(
      '/api/buyer/wishlist',
      query: {'customerId': customerId},
      auth: true,
      parser: (json) {
        final list = json is List
            ? json
            : (json is Map && json['items'] is List
                ? json['items'] as List
                : const []);
        return list
            .whereType<Map>()
            .map((e) => WishlistItem.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      },
    );
  }

  Future<void> deleteWishlistItem(String id) async {
    await _client.delete(
      '/api/buyer/wishlist/$id',
      auth: true,
      parser: (_) => true,
    );
  }

  Future<List<SupportTicket>> listSupportTickets({required String customerId}) {
    return _client.get(
      '/api/buyer/support-tickets',
      query: {'customerId': customerId},
      auth: true,
      parser: (json) {
        final list = json is List
            ? json
            : (json is Map && json['tickets'] is List
                ? json['tickets'] as List
                : const []);
        return list
            .whereType<Map>()
            .map((e) => SupportTicket.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      },
    );
  }

  Future<SupportTicket> createSupportTicket({
    required String customerId,
    required String subject,
    required String message,
    String priority = 'normal',
  }) {
    return _client.post(
      '/api/buyer/support-tickets',
      body: {
        'customerId': customerId,
        'subject': subject,
        'message': message,
        'priority': priority,
      },
      auth: true,
      parser: (json) => SupportTicket.fromJson(
        json is Map ? Map<String, dynamic>.from(json) : <String, dynamic>{},
      ),
    );
  }

  Future<List<Product>> listProducts({String? category, String? q}) async {
    final query = <String, String>{};
    if (category != null && category.isNotEmpty) query['category'] = category;
    if (q != null && q.isNotEmpty) query['q'] = q;
    if (kDebugMode) {
      // ignore: avoid_print
      print('[MyGarage] GET ${AppConfig.apiUrl}/api/products');
    }
    return _client.get(
      '/api/products',
      query: query.isEmpty ? null : query,
      parser: _parseProductList,
    );
  }

  /// Loads products for a category page (web-aligned API + catalog fallback).
  Future<List<Product>> listProductsByCategory(String name) async {
    final trimmed = name.trim();
    if (trimmed.isEmpty) return [];

    final fromApi = await _client.get(
      '/api/products/by-category',
      query: {'name': trimmed},
      parser: _parseProductList,
    );
    if (fromApi.isNotEmpty) return fromApi;

    // Sidebar tree may not include product.category values used in search.
    final all = await listProducts();
    final target = trimmed.toLowerCase();
    return all
        .where((p) => p.category.trim().toLowerCase() == target)
        .toList();
  }

  static List<Product> _parseProductList(dynamic json) {
    if (json is List) {
      return json
          .whereType<Map>()
          .map((e) => Product.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    }
    if (json is Map && json['products'] is List) {
      return (json['products'] as List)
          .whereType<Map>()
          .map((e) => Product.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    }
    if (json is Map && json['items'] is List) {
      return (json['items'] as List)
          .whereType<Map>()
          .map((e) => Product.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    }
    return <Product>[];
  }

  Future<Product> getProduct(String id) {
    return _client.get(
      '/api/products/$id',
      parser: (json) => Product.fromJson(json as Map<String, dynamic>),
    );
  }

  /// Live typeahead for shop search (categories + ranked products).
  Future<ShopSearchSuggestions> searchSuggestions(
    String q, {
    int limitProducts = 6,
    int limitCategories = 4,
  }) {
    return _client.get(
      '/api/search/suggestions',
      query: {
        'q': q,
        'limitProducts': '$limitProducts',
        'limitCategories': '$limitCategories',
        'limitServices': '1',
        'limitServiceCategories': '1',
      },
      parser: (json) => ShopSearchSuggestions.fromJson(
        json is Map ? Map<String, dynamic>.from(json) : <String, dynamic>{},
      ),
    );
  }

  /// Full shop browse tree (same source as web AddItems sidebar).
  Future<List<ShopCategoryNode>> fetchShopCategoryTree() {
    return _client.get(
      '/api/additems',
      parser: (json) {
        final list = json is Map && json['items'] is List
            ? json['items'] as List
            : (json is List ? json : const []);
        return list
            .whereType<Map>()
            .map((e) => ShopCategoryNode.fromJson(Map<String, dynamic>.from(e)))
            .where((n) => n.title.trim().isNotEmpty)
            .toList();
      },
    );
  }

  Future<BuyerServiceRequest> createServiceRequest(Map<String, dynamic> body) {
    return _client.post(
      '/api/buyer/service-requests',
      body: body,
      auth: true,
      parser: (json) {
        final map = json is Map && json['request'] is Map
            ? Map<String, dynamic>.from(json['request'] as Map)
            : Map<String, dynamic>.from(json as Map);
        return BuyerServiceRequest.fromJson(map);
      },
    );
  }

  Future<({BuyerServiceRequest request, ServiceProviderContact? provider})> getServiceRequestDetail({
    required String requestId,
    required String customerId,
  }) {
    return _client.get(
      '/api/buyer/service-requests/$requestId',
      query: {'customerId': customerId},
      parser: (json) {
        final map = Map<String, dynamic>.from(json as Map);
        final requestJson = map['request'] is Map
            ? Map<String, dynamic>.from(map['request'] as Map)
            : map;
        final providerJson = map['providerContact'];
        return (
          request: BuyerServiceRequest.fromJson(requestJson),
          provider: providerJson is Map
              ? ServiceProviderContact.fromJson(Map<String, dynamic>.from(providerJson))
              : null,
        );
      },
    );
  }

  Future<Map<String, dynamic>> createPaytotaCheckout(Map<String, dynamic> body) {
    return _client.post(
      '/api/paytota/checkout',
      body: {...body, 'platform': 'mobile'},
      auth: true,
      parser: (json) => Map<String, dynamic>.from(json as Map),
    );
  }

  Future<List<OrderSummary>> listOrders({String? customerId}) {
    final query = <String, String>{};
    if (customerId != null && customerId.isNotEmpty) {
      query['customerId'] = customerId;
    }
    return _client.get(
      '/api/orders',
      query: query.isEmpty ? null : query,
      auth: true,
      parser: (json) {
        final list = json is List
            ? json
            : (json is Map && json['orders'] is List ? json['orders'] as List : const []);
        return list
            .whereType<Map>()
            .map((e) => OrderSummary.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      },
    );
  }

  Future<List<Vehicle>> listVehicles({required String customerId}) {
    return _client.get(
      '/api/buyer/vehicles',
      query: {'customerId': customerId},
      auth: true,
      parser: (json) {
        final list = json is List
            ? json
            : (json is Map && json['vehicles'] is List ? json['vehicles'] as List : const []);
        return list
            .whereType<Map>()
            .map((e) => Vehicle.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      },
    );
  }

  Future<Vehicle> createVehicle(Map<String, dynamic> body) {
    return _client.post(
      '/api/buyer/vehicles',
      body: body,
      auth: true,
      parser: (json) {
        final map = json is Map && json['vehicle'] is Map
            ? Map<String, dynamic>.from(json['vehicle'] as Map)
            : Map<String, dynamic>.from(json as Map);
        return Vehicle.fromJson(map);
      },
    );
  }

  Future<List<Map<String, dynamic>>> geocodeSuggestions(String q) {
    return _client.get(
      '/api/geocode/suggestions',
      query: {'q': q},
      parser: (json) {
        final list = json is List
            ? json
            : (json is Map && json['suggestions'] is List ? json['suggestions'] as List : const []);
        return list.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
      },
    );
  }
}
