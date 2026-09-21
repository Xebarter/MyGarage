import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import '../config.dart';
import '../models/buyer_control_center.dart' hide VehicleDocument;
import '../models/concierge.dart';
import '../models/models.dart';
import 'api_client.dart';

class BuyerApi {
  BuyerApi(this._client);

  final ApiClient _client;

  Future<BuyerProfile> fetchProfile({
    String? customerId,
    String? email,
    String? phone,
  }) {
    final query = <String, String>{};
    if (customerId != null && customerId.trim().isNotEmpty) {
      query['customerId'] = customerId.trim();
    }
    if (email != null && email.trim().isNotEmpty) {
      query['email'] = email.trim();
    }
    if (phone != null && phone.trim().isNotEmpty) {
      query['phone'] = phone.trim();
    }
    return _client.get(
      '/api/buyer/profile',
      query: query,
      parser: (json) => BuyerProfile.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<BuyerProfile> createProfile({
    String? id,
    required String name,
    required String email,
    String phone = '',
  }) {
    return _client.post(
      '/api/buyer/profile',
      body: {
        if (id != null && id.trim().isNotEmpty) 'id': id.trim(),
        'name': name,
        'email': email,
        'phone': phone,
      },
      parser: (json) => BuyerProfile.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<String> exchangePhoneIdToken(String idToken) {
    return _client.post(
      '/api/auth/phone/session',
      body: {'idToken': idToken},
      parser: (json) {
        final map = json is Map ? Map<String, dynamic>.from(json) : <String, dynamic>{};
        final refresh = map['refresh_token']?.toString() ?? '';
        if (refresh.isEmpty) {
          throw ApiException(map['error']?.toString() ?? 'Could not start session.');
        }
        return refresh;
      },
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
    String? customerPhone,
  }) {
    return _client.post(
      '/api/buyer/subscriptions',
      body: {
        'customerId': customerId,
        'planTier': planTier,
        'platform': 'mobile',
        if (customerPhone != null && customerPhone.trim().isNotEmpty)
          'customerPhone': customerPhone.trim(),
      },
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

  Future<List<BuyerServiceRequest>> listServiceRequests(String customerId) {
    return _client.get(
      '/api/buyer/service-requests',
      query: {'customerId': customerId},
      auth: true,
      parser: (json) {
        final list = json is List ? json : const [];
        return list
            .whereType<Map>()
            .map((e) => BuyerServiceRequest.fromJson(Map<String, dynamic>.from(e)))
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

  /// Restarts provider search on an expired or cancelled request (same id).
  Future<void> restartServiceRequestSearch({
    required String requestId,
    required String customerId,
  }) {
    return _client.post(
      '/api/buyer/service-requests/$requestId',
      body: {
        'action': 'restart',
        'customerId': customerId,
      },
      auth: true,
      parser: (_) => true,
    ).then((_) {});
  }

  /// Cancels while searching or before the assigned provider arrives.
  Future<void> cancelServiceRequestSearch({
    required String requestId,
    required String customerId,
    required String reasonId,
    String? note,
  }) {
    return _client.post(
      '/api/buyer/service-requests/$requestId',
      body: {
        'action': 'cancel',
        'customerId': customerId,
        'reasonId': reasonId,
        if (note != null && note.trim().isNotEmpty) 'note': note.trim(),
      },
      auth: true,
      parser: (_) => true,
    ).then((_) {});
  }

  Future<Map<String, dynamic>> createPaytotaCheckout(Map<String, dynamic> body) {
    return _client.post(
      '/api/paytota/checkout',
      body: {...body, 'platform': 'mobile'},
      auth: true,
      parser: (json) => Map<String, dynamic>.from(json as Map),
    );
  }

  Future<void> activateSubscription({required String checkoutId}) async {
    try {
      await _client.post(
        '/api/buyer/subscriptions/activate',
        body: {'checkoutId': checkoutId},
        auth: true,
        parser: (_) => true,
      );
    } on ApiException catch (e) {
      if (e.statusCode == 404) return;
      rethrow;
    }
  }

  Future<OrderSummary?> getOrderByCheckoutId(String checkoutId) async {
    try {
      return await _client.get<OrderSummary?>(
        '/api/orders',
        query: {'checkoutId': checkoutId},
        auth: true,
        parser: (json) {
          if (json is! Map) return null;
          final order = OrderSummary.fromJson(Map<String, dynamic>.from(json));
          return order.id.isEmpty ? null : order;
        },
      );
    } on ApiException catch (e) {
      if (e.statusCode == 404) return null;
      rethrow;
    }
  }

  Future<OrderSummary?> waitForOrderByCheckoutId(
    String checkoutId, {
    int attempts = 8,
    Duration delay = const Duration(milliseconds: 1500),
  }) async {
    for (var i = 0; i < attempts; i++) {
      try {
        final order = await getOrderByCheckoutId(checkoutId);
        if (order != null) return order;
      } catch (_) {}
      if (i < attempts - 1) {
        await Future<void>.delayed(delay);
      }
    }
    return null;
  }

  Future<Map<String, dynamic>> createServicePayment({
    required String customerId,
    required String customerName,
    required String customerEmail,
    required String customerPhone,
    String? servicePaymentId,
    String? requestId,
    double? amount,
    String? providerId,
  }) {
    return _client.post(
      '/api/paytota/service-payment',
      body: {
        'customerId': customerId,
        'customerName': customerName,
        'customerEmail': customerEmail,
        'customerPhone': customerPhone,
        'platform': 'mobile',
        if (servicePaymentId != null && servicePaymentId.isNotEmpty)
          'servicePaymentId': servicePaymentId,
        if (requestId != null && requestId.isNotEmpty) 'requestId': requestId,
        if (amount != null) 'amount': amount,
        if (providerId != null && providerId.isNotEmpty) 'providerId': providerId,
      },
      auth: true,
      parser: (json) =>
          json is Map ? Map<String, dynamic>.from(json) : <String, dynamic>{},
    );
  }

  Future<List<OrderSummary>> listOrders({String? customerId, String? email}) {
    final query = <String, String>{};
    if (customerId != null && customerId.isNotEmpty) {
      query['customerId'] = customerId;
    } else if (email != null && email.isNotEmpty) {
      query['email'] = email;
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

  Future<OrderDetail> getOrder(String id) {
    return _client.get(
      '/api/orders/${Uri.encodeComponent(id)}',
      auth: true,
      parser: (json) => OrderDetail.fromJson(
        json is Map ? Map<String, dynamic>.from(json) : <String, dynamic>{},
      ),
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

  Future<Vehicle> updateVehicle(String id, Map<String, dynamic> body) {
    return _client.put(
      '/api/buyer/vehicles/$id',
      body: body,
      auth: true,
      parser: (json) => Vehicle.fromJson(Map<String, dynamic>.from(json as Map)),
    );
  }

  Future<void> deleteVehicle(String id) {
    return _client.delete(
      '/api/buyer/vehicles/$id',
      auth: true,
      parser: (_) => true,
    ).then((_) {});
  }

  Future<({Vehicle? vehicle, List<VehicleServiceLog> history})> getVehicleServiceHistory(String id) {
    return _client.get(
      '/api/buyer/vehicles/$id/service-history',
      auth: true,
      parser: (json) {
        final map = json is Map ? Map<String, dynamic>.from(json) : <String, dynamic>{};
        final vehicleJson = map['vehicle'];
        final historyJson = map['history'];
        return (
          vehicle: vehicleJson is Map ? Vehicle.fromJson(Map<String, dynamic>.from(vehicleJson)) : null,
          history: historyJson is List
              ? historyJson
                  .whereType<Map>()
                  .map((e) => VehicleServiceLog.fromJson(Map<String, dynamic>.from(e)))
                  .toList()
              : <VehicleServiceLog>[],
        );
      },
    );
  }

  Future<List<VehicleDocument>> listVehicleDocuments({
    required String customerId,
    required String vehicleId,
  }) {
    return _client.get(
      '/api/buyer/vehicle-documents',
      query: {'customerId': customerId, 'vehicleId': vehicleId},
      auth: true,
      parser: (json) {
        final list = json is List ? json : const [];
        return list
            .whereType<Map>()
            .map((e) => VehicleDocument.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      },
    );
  }

  Future<VehicleDocument> createVehicleDocument(Map<String, dynamic> body) {
    return _client.post(
      '/api/buyer/vehicle-documents',
      body: body,
      auth: true,
      parser: (json) => VehicleDocument.fromJson(Map<String, dynamic>.from(json as Map)),
    );
  }

  Future<String> uploadVehicleImage(List<int> bytes, String filename) {
    return _client.postMultipart(
      '/api/uploads/vehicle-image',
      files: [http.MultipartFile.fromBytes('file', bytes, filename: filename)],
      parser: (json) => (json as Map<String, dynamic>)['url']?.toString() ?? '',
    );
  }

  Future<List<Map<String, dynamic>>> geocodeSuggestions(
    String q, {
    double? lat,
    double? lng,
    String? sessionToken,
    int limit = 6,
  }) {
    final query = <String, String>{
      'q': q,
      'limit': '$limit',
    };
    if (lat != null) query['lat'] = lat.toString();
    if (lng != null) query['lng'] = lng.toString();
    if (sessionToken != null && sessionToken.isNotEmpty) {
      query['sessionToken'] = sessionToken;
    }
    return _client.get(
      '/api/geocode/suggestions',
      query: query,
      parser: (json) {
        final list = json is List
            ? json
            : (json is Map && json['suggestions'] is List ? json['suggestions'] as List : const []);
        return list.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
      },
    );
  }

  Future<Map<String, dynamic>> geocodePlace(
    String placeId, {
    String? sessionToken,
  }) {
    final query = <String, String>{'placeId': placeId};
    if (sessionToken != null && sessionToken.isNotEmpty) {
      query['sessionToken'] = sessionToken;
    }
    return _client.get(
      '/api/geocode/place',
      query: query,
      parser: (json) => Map<String, dynamic>.from(json as Map),
    );
  }

  Future<ConciergeChatResult> chatConcierge(Map<String, dynamic> body) {
    return _client.post(
      '/api/buyer/concierge/chat',
      body: body,
      auth: true,
      allowError: true,
      parser: (json) => ConciergeChatResult.fromJson(
        json is Map ? Map<String, dynamic>.from(json) : <String, dynamic>{},
      ),
    );
  }

  Future<ConciergeActResult> actConcierge(Map<String, dynamic> body) {
    return _client.post(
      '/api/buyer/concierge/act',
      body: body,
      auth: true,
      allowError: true,
      parser: (json) => ConciergeActResult.fromJson(
        json is Map ? Map<String, dynamic>.from(json) : <String, dynamic>{},
      ),
    );
  }

  Future<ConciergeShopHome> loadConciergeShop() {
    return _client.get(
      '/api/buyer/concierge/products',
      parser: (json) => ConciergeShopHome.fromJson(
        json is Map ? Map<String, dynamic>.from(json) : <String, dynamic>{},
      ),
    );
  }

  Future<ConciergeProductBrowse> searchConciergeProducts(Map<String, dynamic> body) {
    return _client.post(
      '/api/buyer/concierge/products',
      body: body,
      parser: (json) => ConciergeProductBrowse.fromJson(
        json is Map ? Map<String, dynamic>.from(json) : <String, dynamic>{},
      ),
    );
  }
}
