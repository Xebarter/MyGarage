import '../models/service_listing.dart';
import 'api_client.dart';

class ListingsApi {
  ListingsApi(this._client);

  final ApiClient _client;

  Future<List<ServiceListing>> list(String vendorId) {
    return _client.get(
      '/api/vendor/service-listings',
      query: {'vendorId': vendorId},
      parser: (json) {
        final list = json as List<dynamic>? ?? [];
        return list
            .whereType<Map<String, dynamic>>()
            .map(ServiceListing.fromJson)
            .toList();
      },
    );
  }

  Future<List<ServiceListing>> upsert({
    required String vendorId,
    required List<ServiceListing> listings,
  }) {
    return _client.put(
      '/api/vendor/service-listings',
      body: {
        'vendorId': vendorId,
        'listings': listings.map((e) => e.toUpsertJson()).toList(),
      },
      parser: (json) {
        final list = json as List<dynamic>? ?? [];
        return list
            .whereType<Map<String, dynamic>>()
            .map(ServiceListing.fromJson)
            .toList();
      },
    );
  }

  Future<void> delete({required String vendorId, required String listingId}) {
    return _client.delete(
      '/api/vendor/service-listings/$listingId',
      query: {'vendorId': vendorId},
      parser: (_) => null,
    );
  }
}
