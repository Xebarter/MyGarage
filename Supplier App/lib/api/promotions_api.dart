import '../models/promotion.dart';
import 'api_client.dart';

class PromotionsApi {
  PromotionsApi(this._client);

  final ApiClient _client;

  Future<List<Promotion>> listPromotions() {
    return _client.get(
      '/api/promotions',
      parser: (json) {
        final list = json is List ? json : const [];
        return list
            .whereType<Map>()
            .map((e) => Promotion.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      },
    );
  }

  Future<List<AdApplication>> listApplications(String vendorId) {
    return _client.get(
      '/api/ad-applications',
      query: {'vendorId': vendorId},
      parser: (json) {
        final list = json is List ? json : const [];
        return list
            .whereType<Map>()
            .map((e) => AdApplication.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      },
    );
  }

  Future<AdApplication> apply({
    required String vendorId,
    required String scope,
    String? productId,
    String? productName,
    String? message,
  }) {
    return _client.post(
      '/api/ad-applications',
      auth: true,
      body: {
        'vendorId': vendorId,
        'scope': scope,
        if (productId != null) 'productId': productId,
        if (productName != null) 'productName': productName,
        if (message != null && message.isNotEmpty) 'message': message,
      },
      parser: (json) => AdApplication.fromJson(json as Map<String, dynamic>),
    );
  }
}
