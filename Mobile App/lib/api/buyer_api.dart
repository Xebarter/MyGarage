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

  Future<List<Product>> listProducts({String? category, String? q}) async {
    final query = <String, String>{};
    if (category != null && category.isNotEmpty) query['category'] = category;
    if (q != null && q.isNotEmpty) query['q'] = q;
    return _client.get(
      '/api/products',
      query: query.isEmpty ? null : query,
      parser: (json) {
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
      },
    );
  }

  Future<Product> getProduct(String id) {
    return _client.get(
      '/api/products/$id',
      parser: (json) => Product.fromJson(json as Map<String, dynamic>),
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
